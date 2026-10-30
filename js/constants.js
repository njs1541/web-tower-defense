const GAME_VERSION = "v0.36.7";
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
 * 지휘관 듀얼 시너지 시스템 마스터 데이터 (v0.34.0 New)
 * - 100인 이상의 대규모 캐릭터 확장에 유연하게 대응하는 원소(Element) & 역할군(Role) 태그 체계
 */
const SYNERGY_DATA = {
    // 5대 원소 (Element)
    elements: {
        fire: {
            id: "fire",
            name: "화염",
            symbol: "🔥",
            color: "#ef4444",
            bg: "#fef2f2",
            border: "#fca5a5",
            tiers: {
                2: {
                    count: 2,
                    title: "작열의 불꽃",
                    desc: "전 타워 공격 시 25% 확률로 대상에게 3초간 화상 도트 피해 부여"
                },
                3: {
                    count: 3,
                    title: "홍련의 업화",
                    desc: "폭탄 타워 폭발 반경 +1칸 및 전 타워 공격력 +20% 증폭"
                }
            }
        },
        frost: {
            id: "frost",
            name: "빙결",
            symbol: "❄️",
            color: "#06b6d4",
            bg: "#ecfeff",
            border: "#a5f3fc",
            tiers: {
                2: {
                    count: 2,
                    title: "서리 발자국",
                    desc: "얼음 타워 슬로우 감속 효과 +15% 강화 및 지속시간 +1.5초"
                },
                3: {
                    count: 3,
                    title: "절대 영도",
                    desc: "슬로우 상태인 적에게 모든 타워가 주는 피해 +30% 증폭"
                }
            }
        },
        shock: {
            id: "shock",
            name: "전격",
            symbol: "⚡",
            color: "#eab308",
            bg: "#fefce8",
            border: "#fde047",
            tiers: {
                2: {
                    count: 2,
                    title: "과전류 충전",
                    desc: "모든 타워의 공격 속도(쿨다운) 18% 가속"
                },
                3: {
                    count: 3,
                    title: "초전도 방전",
                    desc: "타워 공격 시 25% 확률로 인접 적 2기에게 60% 피해의 연쇄 번개 방전"
                }
            }
        },
        holy: {
            id: "holy",
            name: "신성",
            symbol: "✨",
            color: "#f59e0b",
            bg: "#fffbeb",
            border: "#fcd34d",
            tiers: {
                2: {
                    count: 2,
                    title: "신성한 방벽",
                    desc: "플레이어 최대 기지 HP +6 및 라운드마다 기지 HP +1 회복"
                },
                3: {
                    count: 3,
                    title: "천상의 서광",
                    desc: "모든 타워 치명타 확률 +15% 및 치명타 배율 2.5배로 상향"
                }
            }
        },
        void: {
            id: "void",
            name: "공허",
            symbol: "🌌",
            color: "#a855f7",
            bg: "#faf5ff",
            border: "#d8b4fe",
            tiers: {
                1: {
                    count: 1,
                    title: "시공 왜곡 (조커)",
                    desc: "단독 편성 시에도 모든 활성 원소/역할군 카운트에 +1 추가(와일드카드) 및 전 타워 피해 +10%"
                }
            }
        }
    },
    // 4대 역할군 (Role/Class)
    roles: {
        guardian: {
            id: "guardian",
            name: "수호자",
            symbol: "🛡️",
            color: "#3b82f6",
            bg: "#eff6ff",
            border: "#93c5fd",
            tiers: {
                2: {
                    count: 2,
                    title: "철벽 방진",
                    desc: "게임 시작 시 및 라운드마다 무료 기반(벽) +1개 추가 보급"
                },
                3: {
                    count: 3,
                    title: "불굴의 요새",
                    desc: "근거리 타워 한도 +2강 및 크롤러 몬스터의 기반 철거 소요 시간 2배 증가"
                }
            }
        },
        ranger: {
            id: "ranger",
            name: "사수",
            symbol: "🏹",
            color: "#10b981",
            bg: "#ecfdf5",
            border: "#6ee7b7",
            tiers: {
                2: {
                    count: 2,
                    title: "정밀 조준",
                    desc: "원거리 및 저격 타워 공격 사거리 +1칸 확장"
                },
                3: {
                    count: 3,
                    title: "약점 사냥",
                    desc: "보스 및 비행 몬스터에게 주는 모든 타워 피해 +30% 증폭"
                }
            }
        },
        mage: {
            id: "mage",
            name: "마법사",
            symbol: "🔮",
            color: "#8b5cf6",
            bg: "#f5f3ff",
            border: "#c4b5fd",
            tiers: {
                2: {
                    count: 2,
                    title: "마력 공명",
                    desc: "적 처치 시 획득 MP +1 추가 및 마나 최대치 120으로 확장"
                },
                3: {
                    count: 3,
                    title: "비전 폭주",
                    desc: "모든 액티브 스펠 룬 데미지 및 효과 +30% 강화"
                }
            }
        },
        tactician: {
            id: "tactician",
            name: "전술가",
            symbol: "⚙️",
            color: "#ea580c",
            bg: "#fff7ed",
            border: "#fdba74",
            tiers: {
                2: {
                    count: 2,
                    title: "보급로 확보",
                    desc: "웨이브 클리어 보너스 +3 TP(골드) 추가 지급"
                },
                3: {
                    count: 3,
                    title: "전술 지휘",
                    desc: "인게임 타워 레벨업 강화 비용(TP) 20% 할인"
                }
            }
        }
    }
};

/**
 * 미소녀 지휘관 캐릭터 레지스트리 (CHARACTER_DATA)
 * - 덱 편성 시 타워별 인게임 최대 강화 한도(levelCaps)를 제공
 * - 성급(star)에 따라 소켓 수 확장
 * - element(5대 원소) 및 role(4대 역할군) 태그 보유 (v0.34.0)
 */
const CHARACTER_DATA = {
    char_liana: {
        id: "char_liana",
        name: "리아나",
        title: "견습 성기사",
        grade: "C",
        element: "holy",
        role: "guardian",
        avatar: "🛡️",
        image: "assets/char_liana.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            melee: 1
        },
        towerStock: {
            melee: 4
        },
        refundRate: 1.0,
        quotes: [
            "처음 뵙겠습니다, 지휘관님! 미숙하지만 최선을 다해 방패를 들겠습니다!",
            "훈련은 매일 빠짐없이 하고 있어요! 언제든 출격 명령을 내려주세요.",
            "제가 지휘관님의 가장 든든한 방패가 되어 드릴게요!"
        ],
        skillQuote: "모두 제 방패 뒤로! 신성한 수호의 결계!",
        desc: "최전선에서 아군을 보호하는 열정 넘치는 성기사. 근거리 타워 최대 4기 설치 스톡을 제공하며 철거 시 100% 전액 환급됩니다."
    },
    char_elena: {
        id: "char_elena",
        name: "엘레나",
        title: "바람의 사수",
        grade: "UC",
        element: "frost",
        role: "ranger",
        avatar: "🏹",
        image: "assets/char_elena.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            ranged: 2
        },
        towerStock: {
            ranged: 3
        },
        refundRate: 0.8,
        quotes: [
            "바람의 흐름이 느껴지나요? 표적은 이미 제 조준선 안에 있어요.",
            "지휘관님, 숲의 바람이 우리를 반드시 승리로 이끌어 줄 거예요.",
            "원거리의 적은 걱정 마세요. 제 화살은 단 한 번도 빗나가지 않으니까요."
        ],
        skillQuote: "바람이여, 적을 꿰뚫어라! 질풍의 일격!",
        desc: "먼 거리의 표적도 놓치지 않는 엘프 명사수. 원거리 타워 최대 3기 설치 스톡을 제공합니다."
    },
    // [v0.26.0 신규 타워 전담 언커먼 지휘관 라인업]
    char_chloe: {
        id: "char_chloe",
        name: "클로에",
        title: "강철의 검사",
        grade: "UC",
        element: "fire",
        role: "guardian",
        avatar: "⚔️",
        image: "assets/char_chloe.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            melee: 2
        },
        towerStock: {
            melee: 3
        },
        refundRate: 0.8,
        quotes: [
            "검을 뽑은 이상 망설임은 없다. 지휘관, 전열 돌파 준비 완료다.",
            "강철은 뜨거운 불 속에서 단련되는 법. 어떤 몬스터든 베어 넘기겠다.",
            "지휘관의 명령이라면 지옥의 한복판이라도 기꺼이 돌격하겠다!"
        ],
        skillQuote: "강철의 의지로 베어 넘긴다! 전열 돌파!",
        desc: "전열을 용맹하게 돌파하는 강철의 여기사. 근거리 타워 최대 3기 설치 스톡을 제공합니다."
    },
    char_charlotte: {
        id: "char_charlotte",
        name: "샤를로트",
        title: "매의 눈 저격수",
        grade: "UC",
        element: "shock",
        role: "ranger",
        avatar: "🎯",
        image: "assets/char_charlotte.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            sniper: 2
        },
        towerStock: {
            sniper: 3
        },
        refundRate: 0.8,
        quotes: [
            "심호흡 한 번, 방아쇠 한 번. 그걸로 승부는 끝입니다.",
            "적의 약점은 이미 포착되었습니다. 지휘관님, 발사 승인만 내려주세요.",
            "사거리 안으로 들어온 사냥감은 절대 제 시야에서 벗어날 수 없어요."
        ],
        skillQuote: "호흡을 멈추고... 표적 확인, 정밀 저격!",
        desc: "초장거리 정밀 사격에 특화된 냉철한 스나이퍼. 저격 타워 최대 3기 설치 스톡을 제공합니다."
    },
    char_cecilia: {
        id: "char_cecilia",
        name: "세실리아",
        title: "서리의 마도사",
        grade: "UC",
        element: "frost",
        role: "mage",
        avatar: "❄️",
        image: "assets/char_cecilia.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            ice: 2
        },
        towerStock: {
            ice: 3
        },
        refundRate: 0.8,
        quotes: [
            "서리의 결정이 참 예쁘죠? 하지만 적들에게는 치명적인 덫이랍니다.",
            "지휘관님의 차가운 판단력, 아주 마음에 들어요. 후후.",
            "냉기 속에서 잠시 쉬어가시겠어요? 적들은 제가 꽁꽁 얼려둘게요."
        ],
        skillQuote: "영구 동토의 한기여... 모조리 얼어붙어라!",
        desc: "차가운 서리 결정으로 적의 발을 묶는 빙결 마법사. 얼음 타워 최대 3기 설치 스톡을 제공합니다."
    },
    char_greta: {
        id: "char_greta",
        name: "그레타",
        title: "화약의 포격수",
        grade: "UC",
        element: "fire",
        role: "tactician",
        avatar: "💣",
        image: "assets/char_greta.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            bomb: 2
        },
        towerStock: {
            bomb: 3
        },
        refundRate: 0.8,
        quotes: [
            "폭발이야말로 최고의 예술이지! 빵빵 터질 때의 쾌감, 지휘관도 알지?",
            "지휘관! 이번엔 특제 화약 배합을 써봤는데, 기대해도 좋아!",
            "적들이 몰려온다고? 하하! 오히려 환영이야, 한 방에 날려줄 테니!"
        ],
        skillQuote: "특제 폭약 장전 완료! 흔적도 없이 날아가라, 쾅!",
        desc: "광역 포격으로 적군을 단숨에 초토화하는 화약 전문가. 폭탄 타워 최대 3기 설치 스톡을 제공합니다."
    },
    char_ada: {
        id: "char_ada",
        name: "에이다",
        title: "벽력의 정령사",
        grade: "UC",
        element: "shock",
        role: "mage",
        avatar: "⚡",
        image: "assets/char_ada.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            shock: 2
        },
        towerStock: {
            shock: 3
        },
        refundRate: 0.8,
        quotes: [
            "찌릿찌릿한 번개의 힘, 느껴져? 전선을 모조리 감전시켜 줄게!",
            "번개는 가장 빠른 심판이지. 지휘관님, 눈 깜빡이지 마세요!",
            "벼락의 정령들이 노래하고 있어. 적들을 초토화할 시간이야."
        ],
        skillQuote: "하늘의 벼락이여! 연쇄 낙뢰여 내리쳐라!",
        desc: "연쇄 번개로 다수의 적을 감전시키는 전격의 인도자. 전격 타워 최대 3기 설치 스톡을 제공합니다."
    },
    char_freya: {
        id: "char_freya",
        name: "프레이야",
        title: "서리의 마녀",
        grade: "R",
        element: "frost",
        role: "mage",
        avatar: "❄️",
        image: "assets/char_freya.jpg",
        maxSockets: 3,
        baseSockets: 2,
        levelCaps: {
            ice: 2,
            bomb: 1
        },
        towerStock: {
            ice: 1,
            bomb: 1
        },
        refundRate: 0.6,
        quotes: [
            "절대 영도의 세계에 오신 것을 환영해요, 나의 지휘관님.",
            "차갑게 얼어붙은 영혼은 너무나 쉽게 부서지는 법이지요... 후후.",
            "얼음과 폭염의 이중주, 그 아름다운 파멸의 춤을 보여드릴게요."
        ],
        skillQuote: "혹한의 폭풍이여 휘몰아쳐라! 블리자드 버스트!",
        desc: "영구 동토의 한기를 다루는 빙결 마법사. 얼음 타워 1기와 폭탄 타워 1기 고정 스톡을 제공합니다."
    },
    char_scarlet: {
        id: "char_scarlet",
        name: "스칼렛",
        title: "비전 폭파술사",
        grade: "SR",
        element: "fire",
        role: "tactician",
        avatar: "💣",
        image: "assets/char_scarlet.jpg",
        maxSockets: 4,
        baseSockets: 2,
        levelCaps: {
            bomb: 3,
            melee: 1
        },
        towerStock: {
            bomb: 2
        },
        refundRate: 0.6,
        quotes: [
            "연금술의 정점은 역시 폭발이지! 지휘관, 내 비전 플라스크 건드리면 안 돼?",
            "비전의 불꽃이 타오르고 있어... 오늘 전장은 아주 화끈할 거야!",
            "후후, 적들이 잿더미로 분해되는 광경을 1열에서 감상하게 해줄게."
        ],
        skillQuote: "비전 연금술 궁극 비오의! 홍련의 대폭발!",
        desc: "폭발이야말로 예술이라 믿는 천재 연금술사. 폭탄 타워 최대 2기 설치 스톡을 제공하며 한도를 +3 개방합니다."
    },
    char_seraphina: {
        id: "char_seraphina",
        name: "세라피나",
        title: "성스러운 대사제",
        grade: "UR",
        element: "holy",
        role: "mage",
        avatar: "✨",
        image: "assets/char_seraphina.jpg",
        maxSockets: 5,
        baseSockets: 3,
        isHeroUnit: true,
        heroType: "hero",
        levelCaps: {
            ranged: 3,
            sniper: 3
        },
        towerStock: {},
        refundRate: 0.6,
        quotes: [
            "빛의 축복이 지휘관님과 이 성스러운 영지에 가득하기를 기원합니다.",
            "어둠이 아무리 깊어도, 신성한 서광은 결코 사그라지지 않아요.",
            "지휘관님의 정의로운 싸움에, 하늘의 천사들이 언제나 함께할 것입니다."
        ],
        skillQuote: "찬란한 빛의 권능이여, 악한 자들을 정화하라! 홀리 생츄어리!",
        desc: "신성한 빛으로 전장을 축복하는 고위 대사제. 타워를 설치하지 않고 전장에 직접 강림하여 3x3 아군 타워에 신성 지휘 오라를 부여합니다."
    },
    char_lumina: {
        id: "char_lumina",
        name: "루미나",
        title: "성간의 지배자",
        grade: "U",
        element: "void",
        role: "guardian",
        avatar: "🌌",
        image: "assets/char_lumina.jpg",
        maxSockets: 6,
        baseSockets: 4,
        isHeroUnit: true,
        heroType: "hero",
        levelCaps: {
            melee: 2,
            ranged: 2,
            ice: 2,
            bomb: 2,
            sniper: 2
        },
        towerStock: {},
        refundRate: 0.6,
        quotes: [
            "무수한 별들이 지휘관, 바로 너의 고귀한 운명을 축복하고 있구나.",
            "은하의 거대한 소용돌이 속에서, 영원한 질서를 새길지어다.",
            "필멸자여, 두려워 말라. 우주의 절대적 권능이 그대의 검이 될지니."
        ],
        skillQuote: "성좌의 궤도를 열어라! 심우주의 절대 심판, 코스믹 노바!",
        desc: "별의 기운을 다스리는 최고위 유니크 지휘관. 전장에 직접 강림하여 전장의 기반을 수호하고 전 타워 한도를 전방위 확장합니다."
    },
    // [v0.35.0 대규모 확장 신규 지휘관 9인 라인업]
    char_mia: {
        id: "char_mia",
        name: "미아",
        title: "숲의 견습사수",
        grade: "C",
        element: "frost",
        role: "ranger",
        avatar: "🏹",
        image: "assets/char_mia.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            ranged: 1
        },
        towerStock: {
            ranged: 4
        },
        refundRate: 1.0,
        quotes: [
            "숲의 요정님, 빗맞히지 않도록 힘을 주세요!",
            "견습이지만 활시위를 당길 때는 누구보다 진지해요!",
            "지휘관님 곁에서 훌륭한 사수로 성장하고 싶어요!"
        ],
        skillQuote: "바람을 타고 날아가는 화살! 서리 바람 사격!",
        desc: "엘프 숲의 순수하고 호기심 많은 견습 궁수. 원거리 타워 최대 4기 설치 스톡을 제공하며 철거 시 100% 전액 환급됩니다."
    },
    char_hana: {
        id: "char_hana",
        name: "하나",
        title: "초보 연금술사",
        grade: "C",
        element: "fire",
        role: "tactician",
        avatar: "💣",
        image: "assets/char_hana.jpg",
        maxSockets: 2,
        baseSockets: 1,
        levelCaps: {
            bomb: 1
        },
        towerStock: {
            bomb: 4
        },
        refundRate: 1.0,
        quotes: [
            "이 가루랑 저 약초를 배합하면... 꺄악, 또 폭발이야?!",
            "실패는 성공의 어머니랬어요! 이번엔 진짜 안전해요, 지휘관님!",
            "방벽 쌓는 일이라면 제게 맡겨주세요! 기반을 튼튼하게 다질게요!"
        ],
        skillQuote: "비전 가루 투척 완료! 반짝이는 불꽃 팡팡!",
        desc: "실수투성이지만 당차고 밝은 견습 연금술사. 폭탄 타워 최대 4기 설치 스톡을 제공하며 철거 시 100% 전액 환급됩니다."
    },
    char_valeria: {
        id: "char_valeria",
        name: "발레리아",
        title: "뇌명의 여기사",
        grade: "R",
        element: "shock",
        role: "guardian",
        avatar: "⚡",
        image: "assets/char_valeria.jpg",
        maxSockets: 3,
        baseSockets: 2,
        levelCaps: {
            shock: 2,
            melee: 1
        },
        towerStock: {
            shock: 1,
            melee: 1
        },
        refundRate: 0.6,
        quotes: [
            "내 칼끝에 서린 벼락이 전선의 길을 열 것이다.",
            "수호의 맹세를 저버릴 바엔 칼을 부러뜨리겠다. 지휘관, 명령을 내려라.",
            "번개처럼 파고들어 전열을 사수한다. 물러설 생각은 마라!"
        ],
        skillQuote: "뇌명의 권능이여 검날에 깃들어라! 썬더 슬래시!",
        desc: "번개의 칼날을 휘두르며 최전선을 사수하는 용맹한 여기사. 전격 타워 1기와 근거리 타워 1기 고정 스톡을 제공합니다."
    },
    char_sylvia: {
        id: "char_sylvia",
        name: "실비아",
        title: "천상의 명사수",
        grade: "R",
        element: "holy",
        role: "ranger",
        avatar: "✨",
        image: "assets/char_sylvia.jpg",
        maxSockets: 3,
        baseSockets: 2,
        levelCaps: {
            sniper: 2,
            ranged: 1
        },
        towerStock: {
            sniper: 1,
            ranged: 1
        },
        refundRate: 0.6,
        quotes: [
            "빛의 날개를 펴고, 하늘에서 정의의 심판을 내리겠습니다.",
            "어둠 속에 숨어도 제 순백의 조준경을 벗어날 수는 없어요.",
            "지휘관님의 명령이라면 저 하늘 끝까지 화살을 쏘아 올리겠어요."
        ],
        skillQuote: "빛의 날개여 흩날려라! 천상의 심판 화살!",
        desc: "하얀 날개로 하늘을 날며 악을 저격하는 천상의 궁수. 저격 타워 1기와 원거리 타워 1기 고정 스톡을 제공합니다."
    },
    char_camilla: {
        id: "char_camilla",
        name: "카밀라",
        title: "강철 참모관",
        grade: "R",
        element: "fire",
        role: "tactician",
        avatar: "⚙️",
        image: "assets/char_camilla.jpg",
        maxSockets: 3,
        baseSockets: 2,
        levelCaps: {
            bomb: 2,
            melee: 1
        },
        towerStock: {
            bomb: 1,
            melee: 1
        },
        refundRate: 0.6,
        quotes: [
            "전선 배치는 완벽합니다. 포격 개시를 승인해주십시오, 사령관님.",
            "승리는 운이 아니라 정밀한 탄도 계산과 진지 구축의 결과입니다.",
            "적의 진군 속도와 미로 경로 분석 완료. 오차는 0%입니다."
        ],
        skillQuote: "전 포대 동시 조준! 십자 화망 일제 포격!",
        desc: "화력 집중과 미로 요새 구축의 천재 군사 참모. 폭탄 타워 1기와 근거리 타워 1기 고정 스톡을 제공합니다."
    },
    char_aurelia: {
        id: "char_aurelia",
        name: "아우렐리아",
        title: "태양의 성기사장",
        grade: "SR",
        element: "holy",
        role: "guardian",
        avatar: "🛡️",
        image: "assets/char_aurelia.jpg",
        maxSockets: 4,
        baseSockets: 2,
        levelCaps: {
            melee: 3,
            sniper: 1
        },
        towerStock: {
            melee: 2
        },
        refundRate: 0.6,
        quotes: [
            "태양의 가호가 우리 전군에 함께한다! 기사단이여, 물러서지 마라!",
            "나의 태양 방패가 굳건히 버티는 한, 그 어떤 어둠도 마을을 침범할 수 없다.",
            "지휘관, 그대의 정의로운 깃발 아래 영광의 승리를 바치겠노라."
        ],
        skillQuote: "눈부신 태양의 성벽이여! 절대 불멸의 이지스!",
        desc: "황금빛 태양 방패로 전군을 수호하는 최고위 성기사단장. 근거리 타워 최대 2기 설치 스톡을 제공하며 한도를 +3 개방합니다."
    },
    char_selena: {
        id: "char_selena",
        name: "셀레나",
        title: "빙하의 저격공주",
        grade: "SR",
        element: "frost",
        role: "ranger",
        avatar: "❄️",
        image: "assets/char_selena.jpg",
        maxSockets: 4,
        baseSockets: 2,
        levelCaps: {
            sniper: 3,
            ice: 1
        },
        towerStock: {
            sniper: 1,
            ice: 1
        },
        refundRate: 0.6,
        quotes: [
            "숨소리조차 차갑게 얼어붙는 곳... 거기가 바로 제 사정거리예요.",
            "얼어붙은 탄환은 표적의 심장까지 단숨에 동결시키지요.",
            "후후, 지휘관님의 냉철한 판단, 아주 마음에 쏙 드는군요."
        ],
        skillQuote: "영하 200도의 침묵이여... 표적 완전 동결 저격!",
        desc: "얼음 수정 저격총으로 적을 순식간에 동결시키는 왕국의 저격 공주. 저격 타워 1기와 얼음 타워 1기 고정 스톡을 제공합니다."
    },
    char_eleanor: {
        id: "char_eleanor",
        name: "엘레노어",
        title: "폭풍의 대마도사",
        grade: "SR",
        element: "shock",
        role: "mage",
        avatar: "⚡",
        image: "assets/char_eleanor.jpg",
        maxSockets: 4,
        baseSockets: 2,
        levelCaps: {
            shock: 3,
            ice: 1
        },
        towerStock: {
            shock: 2
        },
        refundRate: 0.6,
        quotes: [
            "대기의 전도율이 임계점을 넘었습니다. 하늘의 분노를 보여드리죠.",
            "번개는 단순한 전류가 아닙니다. 만물을 정화하는 우주의 율법이지요.",
            "지휘관님, 귀를 막으세요. 곧 천지를 뒤흔드는 뇌우가 쏟아집니다!"
        ],
        skillQuote: "뇌운의 소용돌이여 폭발하라! 템페스트 아포칼립스!",
        desc: "전장을 거대한 전자기장 폭풍으로 뒤덮는 번개의 대마도사. 전격 타워 최대 2기 설치 스톡을 제공하며 한도를 +3 개방합니다."
    },
    char_veronica: {
        id: "char_veronica",
        name: "베로니카",
        title: "홍련의 총사령관",
        grade: "UR",
        element: "fire",
        role: "tactician",
        avatar: "👑",
        image: "assets/char_veronica.jpg",
        maxSockets: 5,
        baseSockets: 3,
        isHeroUnit: true,
        heroType: "hero",
        levelCaps: {
            bomb: 3,
            shock: 2
        },
        towerStock: {},
        refundRate: 0.6,
        quotes: [
            "전 함포 일제 사격 준비! 내 바다에 침범한 녀석들을 잿더미로 만들어라!",
            "승리의 불꽃은 언제나 가장 뜨겁게 타오르는 법이다. 지휘관, 나를 따르라!",
            "내 함대의 포문을 본 자 중에 살아남은 적은 없다. 승리는 이미 우리의 것이다!"
        ],
        skillQuote: "홍련의 기함이여, 주포 최대 출력 전탄 발사! 인페르노 밤바드!",
        desc: "불꽃의 함대를 이끄는 카리스마 넘치는 홍련의 제독. 타워를 설치하지 않고 전장에 직접 강림하여 3x3 아군 타워에 홍련 지휘 오라를 부여합니다."
    },
    char_titania: {
        id: "char_titania",
        name: "티타니아",
        title: "창세의 생명신",
        grade: "U",
        element: "void",
        role: "mage",
        avatar: "🌿",
        image: "assets/char_titania.png",
        maxSockets: 6,
        baseSockets: 4,
        isHeroUnit: true,
        heroType: "hero",
        levelCaps: {
            ranged: 2,
            ice: 2,
            shock: 2,
            sniper: 2,
            melee: 2
        },
        towerStock: {},
        refundRate: 0.7,
        quotes: [
            "창세의 세계수 위그드라실의 숨결이 이 대지와 당신을 영원히 수호할 것입니다.",
            "생명과 성운의 근원은 하나... 숲의 속삭임에 귀를 기울여 보세요, 지휘관님.",
            "타락한 심연의 그림자조차 찬란한 생명의 등불 앞에서는 정화될 뿐입니다."
        ],
        skillQuote: "세계수의 신성한 빛이여, 만물을 정화하라! 제네시스 실바나!",
        desc: "창세의 세계수 위그드라실과 공명하는 숲의 종족 신화(U) 등급 여신. 전장에 직접 강림하여 전 필드 아군 타워의 잠재력을 개방하고 세계수 생명 오라를 부여합니다."
    },
    char_sylvana: {
        id: "char_sylvana",
        name: "실바나",
        title: "성역의 여황 (신록의 성소)",
        grade: "UR",
        element: "nature",
        role: "guardian",
        avatar: "👑",
        image: "assets/char_sylvana.jpg",
        maxSockets: 6,
        baseSockets: 4,
        isHeroUnit: true,
        heroType: "hero",
        levelCaps: {
            ranged: 2,
            ice: 2,
            shock: 2,
            sniper: 2,
            melee: 2
        },
        towerStock: {},
        refundRate: 0.7,
        quotes: [
            "신록의 성역에 발을 들이는 자, 세계수의 위대한 가호를 받으리라.",
            "나의 성벽 같은 대방패가 모든 침략자로부터 그대를 지켜낼 것입니다.",
            "성역을 더럽히는 적들에게 자연의 단죄를 내리겠습니다."
        ],
        skillQuote: "성역의 방벽이여 전개하라! 에메랄드 생츄어리!",
        desc: "숲의 종족 성역을 다스리는 초월적 여황. 메가 글래머 체형과 화려한 황금 잎사귀 갑주, 신목의 대방패로 3x3 범위 내 아군 타워에 난공불락의 자연 방벽과 생명력 버프를 부여합니다."
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
        // C 등급 (총 36%)
        { grade: "C", charId: "char_liana", weight: 12 },
        { grade: "C", charId: "char_mia", weight: 12 },
        { grade: "C", charId: "char_hana", weight: 12 },
        // UC 등급 (총 30%)
        { grade: "UC", charId: "char_elena", weight: 5 },
        { grade: "UC", charId: "char_chloe", weight: 5 },
        { grade: "UC", charId: "char_charlotte", weight: 5 },
        { grade: "UC", charId: "char_cecilia", weight: 5 },
        { grade: "UC", charId: "char_greta", weight: 5 },
        { grade: "UC", charId: "char_ada", weight: 5 },
        // R 등급 (총 18%)
        { grade: "R", charId: "char_freya", weight: 4.5 },
        { grade: "R", charId: "char_valeria", weight: 4.5 },
        { grade: "R", charId: "char_sylvia", weight: 4.5 },
        { grade: "R", charId: "char_camilla", weight: 4.5 },
        // SR 등급 (총 10%)
        { grade: "SR", charId: "char_scarlet", weight: 2.5 },
        { grade: "SR", charId: "char_aurelia", weight: 2.5 },
        { grade: "SR", charId: "char_selena", weight: 2.5 },
        { grade: "SR", charId: "char_eleanor", weight: 2.5 },
        // UR 등급 (총 4%)
        { grade: "UR", charId: "char_seraphina", weight: 2.0 },
        { grade: "UR", charId: "char_veronica", weight: 2.0 },
        // U 등급 (총 2%)
        { grade: "U", charId: "char_lumina", weight: 1.0 },
        { grade: "U", charId: "char_titania", weight: 1.0 }
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

/**
 * ============================================================================
 * v0.40.0 100인+ 확장 대응 모듈러 캐릭터(Rig & Parts) 스펙 레지스트리
 * - rigType: 'petite' (단신) | 'standard' (표준) | 'tall' (장신)
 * - backPart: 'none' | 'cape' | 'wings' | 'cosmic_ring' | 'ribbon'
 * - headGear: 'none' | 'tiara' | 'witch_hat' | 'beret' | 'halo' | 'goggles' | 'knight_crest'
 * - weaponType: 'sword' | 'bow' | 'gun' | 'staff' | 'cannon' | 'orb'
 * ============================================================================
 */
const MODULAR_CHARACTER_SPECS = {
    // [C 등급]
    char_liana: {
        rigType: "standard", hairColor: "#fde047", eyeColor: "#2563eb",
        primaryColor: "#eff6ff", secondaryColor: "#f59e0b",
        backPart: "cape", headGear: "knight_crest", weaponType: "sword", weaponColor: "#f59e0b"
    },
    char_mia: {
        rigType: "petite", hairColor: "#86efac", eyeColor: "#16a34a",
        primaryColor: "#dcfce7", secondaryColor: "#15803d",
        backPart: "ribbon", headGear: "beret", weaponType: "bow", weaponColor: "#22c55e"
    },
    char_hana: {
        rigType: "petite", hairColor: "#fda4af", eyeColor: "#e11d48",
        primaryColor: "#ffe4e6", secondaryColor: "#f97316",
        backPart: "ribbon", headGear: "goggles", weaponType: "cannon", weaponColor: "#f97316"
    },
    // [UC 등급]
    char_elena: {
        rigType: "standard", hairColor: "#bbf7d0", eyeColor: "#0ea5e9",
        primaryColor: "#e0f2fe", secondaryColor: "#0284c7",
        backPart: "cape", headGear: "tiara", weaponType: "bow", weaponColor: "#38bdf8"
    },
    char_chloe: {
        rigType: "standard", hairColor: "#f87171", eyeColor: "#dc2626",
        primaryColor: "#fee2e2", secondaryColor: "#991b1b",
        backPart: "cape", headGear: "knight_crest", weaponType: "sword", weaponColor: "#ef4444"
    },
    char_charlotte: {
        rigType: "standard", hairColor: "#c084fc", eyeColor: "#eab308",
        primaryColor: "#f3e8ff", secondaryColor: "#6b21a8",
        backPart: "cape", headGear: "beret", weaponType: "gun", weaponColor: "#a855f7"
    },
    char_cecilia: {
        rigType: "standard", hairColor: "#bae6fd", eyeColor: "#0284c7",
        primaryColor: "#e0f2fe", secondaryColor: "#0369a1",
        backPart: "ribbon", headGear: "witch_hat", weaponType: "staff", weaponColor: "#38bdf8"
    },
    char_greta: {
        rigType: "petite", hairColor: "#fb923c", eyeColor: "#dc2626",
        primaryColor: "#ffedd5", secondaryColor: "#c2410c",
        backPart: "none", headGear: "goggles", weaponType: "cannon", weaponColor: "#ea580c"
    },
    char_ada: {
        rigType: "petite", hairColor: "#fef08a", eyeColor: "#ca8a04",
        primaryColor: "#fef9c3", secondaryColor: "#a16207",
        backPart: "ribbon", headGear: "tiara", weaponType: "staff", weaponColor: "#eab308"
    },
    // [R 등급]
    char_freya: {
        rigType: "tall", hairColor: "#e0f2fe", eyeColor: "#0284c7",
        primaryColor: "#bae6fd", secondaryColor: "#1d4ed8",
        backPart: "cape", headGear: "witch_hat", weaponType: "staff", weaponColor: "#0ea5e9"
    },
    char_valeria: {
        rigType: "tall", hairColor: "#fde047", eyeColor: "#9333ea",
        primaryColor: "#fef3c7", secondaryColor: "#7e22ce",
        backPart: "cape", headGear: "knight_crest", weaponType: "sword", weaponColor: "#f59e0b"
    },
    char_sylvia: {
        rigType: "standard", hairColor: "#fef9c3", eyeColor: "#0ea5e9",
        primaryColor: "#ffffff", secondaryColor: "#eab308",
        backPart: "wings", headGear: "halo", weaponType: "bow", weaponColor: "#fde047"
    },
    char_camilla: {
        rigType: "tall", hairColor: "#cbd5e1", eyeColor: "#dc2626",
        primaryColor: "#f1f5f9", secondaryColor: "#b91c1c",
        backPart: "cape", headGear: "beret", weaponType: "gun", weaponColor: "#ef4444"
    },
    // [SR 등급]
    char_scarlet: {
        rigType: "standard", hairColor: "#f43f5e", eyeColor: "#f59e0b",
        primaryColor: "#ffe4e6", secondaryColor: "#be123c",
        backPart: "cape", headGear: "witch_hat", weaponType: "cannon", weaponColor: "#f43f5e"
    },
    char_aurelia: {
        rigType: "tall", hairColor: "#facc15", eyeColor: "#ea580c",
        primaryColor: "#fef9c3", secondaryColor: "#d97706",
        backPart: "wings", headGear: "knight_crest", weaponType: "sword", weaponColor: "#f59e0b"
    },
    char_selena: {
        rigType: "standard", hairColor: "#7dd3fc", eyeColor: "#1d4ed8",
        primaryColor: "#e0f2fe", secondaryColor: "#1e40af",
        backPart: "cape", headGear: "tiara", weaponType: "gun", weaponColor: "#38bdf8"
    },
    char_eleanor: {
        rigType: "tall", hairColor: "#d8b4fe", eyeColor: "#eab308",
        primaryColor: "#f3e8ff", secondaryColor: "#581c87",
        backPart: "cosmic_ring", headGear: "witch_hat", weaponType: "staff", weaponColor: "#c084fc"
    },
    // [UR / U 결전 히어로 등급]
    char_seraphina: {
        rigType: "tall", hairColor: "#fef08a", eyeColor: "#38bdf8",
        primaryColor: "#ffffff", secondaryColor: "#f59e0b",
        backPart: "wings", headGear: "halo", weaponType: "staff", weaponColor: "#fbbf24"
    },
    char_veronica: {
        rigType: "tall", hairColor: "#fb7185", eyeColor: "#facc15",
        primaryColor: "#881337", secondaryColor: "#f59e0b",
        backPart: "cape", headGear: "beret", weaponType: "sword", weaponColor: "#f43f5e"
    },
    char_lumina: {
        rigType: "tall", hairColor: "#f472b6", eyeColor: "#a855f7",
        primaryColor: "#818cf8", secondaryColor: "#c084fc",
        backPart: "wings", headGear: "halo", weaponType: "staff", weaponColor: "#c084fc",
        sdIdleSprite: "assets/sd_lumina_idle.png",
        sdAttackSprite: "assets/sd_lumina_attack.png",
        sdPartsSheet: "assets/sd_lumina_parts_sheet.jpg",
        refSheet: "assets/ref_lumina_sheet.jpg",
        modularParts: {
            body: "assets/parts/lumina_base_body.png",
            wingsHalo: "assets/parts/lumina_wings_halo.png",
            dress: "assets/parts/lumina_dress.png",
            staff: "assets/parts/lumina_staff.png",
            grimoire: "assets/parts/lumina_grimoire.png",
            orb: "assets/parts/lumina_orb.png"
        }
    },
    char_titania: {
        rigType: "tall", hairColor: "#d9f99d", eyeColor: "#10b981",
        primaryColor: "#10b981", secondaryColor: "#facc15",
        backPart: "wings", headGear: "tiara", weaponType: "staff", weaponColor: "#10b981",
        sdPartsSheet: "assets/sd_titania_parts_sheet.jpg?v=sd3",
        refSheet: "assets/ref_titania_sheet.jpg?v=sd3",
        modularParts: {
            useBaseBody: true,
            mirrorWings: true,
            frontCore: "assets/parts/titania_front_core.png?v=sd3",
            baseBody: "assets/parts/titania_base_body.png?v=sd3",
            exprNeutral: "assets/parts/titania_expr_neutral.png?v=sd3",
            exprSerious: "assets/parts/titania_expr_serious.png?v=sd3",
            headgear: "assets/parts/titania_headgear.png?v=sd3",
            topDress: "assets/parts/titania_top_dress.png?v=sd3",
            bottomSkirt: "assets/parts/titania_bottom_skirt.png?v=sd3",
            wingsCape: "assets/parts/titania_wings_cape.png?v=sd3",
            mainWeapon: "assets/parts/titania_main_weapon.png?v=sd3",
            subWeapon: null,
            underwear: null
        }
    },
    char_sylvana: {
        rigType: "tall", hairColor: "#fef08a", eyeColor: "#10b981",
        primaryColor: "#10b981", secondaryColor: "#f59e0b",
        backPart: "wings", headGear: "tiara", weaponType: "shield", weaponColor: "#10b981",
        standingIllust: "assets/char_sylvana.jpg",
        sheet: "assets/ref_sylvana_sheet.jpg",
        sheetA: "assets/ref_sylvana_sheet_a.jpg",
        sheetB: "assets/ref_sylvana_sheet_b.jpg",
        modularParts: {
            useBaseBody: true,
            mirrorWings: true,
            frontCore: "assets/parts/sylvana_front_core.png",
            baseBody: "assets/parts/sylvana_base_body.png",
            exprNeutral: "assets/parts/sylvana_expr_neutral.png",
            exprSerious: "assets/parts/sylvana_expr_serious.png",
            headgear: "assets/parts/sylvana_headgear.png",
            topDress: "assets/parts/sylvana_top_dress.png",
            bottomSkirt: "assets/parts/sylvana_bottom_skirt.png",
            bottomSkirtBack: "assets/parts/sylvana_bottom_skirt_back.png",
            wingsCape: "assets/parts/sylvana_wings_cape.png",
            mainWeapon: "assets/parts/sylvana_main_weapon.png",
            subWeapon: "assets/parts/sylvana_sub_weapon.png",
            underwear: null
        }
    }
};

/**
 * 지휘관 ID로 모듈러 캐릭터 조립 스펙을 반환 (미등록 신규 지휘관도 100인+ 자동 추론 지원)
 */
function getCharacterModularSpec(charId) {
    if (MODULAR_CHARACTER_SPECS[charId]) {
        return MODULAR_CHARACTER_SPECS[charId];
    }

    const cInfo = (typeof CHARACTER_DATA !== 'undefined' && CHARACTER_DATA[charId]) ? CHARACTER_DATA[charId] : {};
    const elem = cInfo.element || 'holy';
    const role = cInfo.role || 'guardian';
    const grade = cInfo.grade || 'C';

    // 원소별 기본 컬러 팔레트
    const elemPalette = {
        holy: { hair: "#fef08a", primary: "#fef9c3", secondary: "#f59e0b", eye: "#2563eb", weapon: "#fbbf24" },
        fire: { hair: "#fca5a5", primary: "#fee2e2", secondary: "#dc2626", eye: "#ea580c", weapon: "#ef4444" },
        frost: { hair: "#bae6fd", primary: "#e0f2fe", secondary: "#0284c7", eye: "#1d4ed8", weapon: "#38bdf8" },
        shock: { hair: "#e9d5ff", primary: "#f3e8ff", secondary: "#7e22ce", eye: "#ca8a04", weapon: "#eab308" },
        void: { hair: "#ddd6fe", primary: "#312e81", secondary: "#c084fc", eye: "#fde047", weapon: "#a855f7" }
    };
    const pal = elemPalette[elem] || elemPalette.holy;

    // 역할군별 기본 무기 및 헤드기어 추론
    const roleWeaponMap = { guardian: "sword", ranger: "bow", mage: "staff", tactician: "cannon" };
    const roleHeadMap = { guardian: "knight_crest", ranger: "tiara", mage: "witch_hat", tactician: "beret" };

    // 등급별 등 파츠 및 체형 추론
    let backPart = "cape";
    let rigType = "standard";
    if (grade === "U") {
        backPart = "cosmic_ring";
        rigType = "tall";
    } else if (grade === "UR" || grade === "SR") {
        backPart = (elem === "holy") ? "wings" : "cape";
        rigType = "tall";
    } else if (grade === "C") {
        backPart = "ribbon";
        rigType = "petite";
    }

    return {
        rigType: rigType,
        hairColor: pal.hair,
        eyeColor: pal.eye,
        primaryColor: pal.primary,
        secondaryColor: pal.secondary,
        backPart: backPart,
        headGear: (grade === "U" || grade === "UR") ? "halo" : (roleHeadMap[role] || "tiara"),
        weaponType: (grade === "U") ? "orb" : (roleWeaponMap[role] || "sword"),
        weaponColor: pal.weapon
    };
}



