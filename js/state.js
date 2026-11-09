let board = [];
let enemies = [];
let path = [];
let round = 1;
let playerHP = 10;
let maxPlayerHP = 10;
let gold = 10;
let gameRunning = false;
let selectedTower = null;
let gameInterval;
let spawnInterval;
let interactionMode = 'none'; // 'none', 'build', 'base'(구 unlock)

let spawnedCount = 0;
let totalEnemies = 0;

// 배속 및 일시정지 상태 (Phase A)
let gameSpeed = 1; // 1: 기본속도, 2: 2배속
let isPaused = false; // 일시정지 여부
let selectedBoardTower = null; // 필드에서 선택된 타워 {x, y, tower}

// 미로 구축 및 기반 건설 상태 (v0.21.0)
let startPos = { x: 10, y: 0 };
let goalPos = { x: 10, y: 19 };
let builtBaseCount = 0; // 건설된 기반(벽) 총 개수

// 스테이지 관리 (Phase D)
let currentStage = 1;

// v0.22.0 마나 및 지휘관 덱 타워 강화 한도
let mp = 0;              // 현재 마나 포인트 (MP)
let maxMp = 100;         // 최대 마나 포인트
let bossKilledThisRound = false; // v0.45.0 이번 라운드 보스 처치 여부 (출구 누출과 구분)
let deckTowerCaps = {    // 출전 캐릭터들로부터 계산된 타워별 최대 인게임 강화 가능 레벨
    ranged: 0,
    melee: 0,
    ice: 0,
    bomb: 0
};

// [v0.41.0 정리] v0.25.0 스타팅 무료 보급 상태(commanderSupplies, selectedSupplyType) 전면 제거
// [v0.41.0 정리] v0.32.0 구형 대장 필드 강림 상태(leaderDeployed, leaderPos 등) 전면 제거
//   -> 전장 강림은 아래 v0.39.0 히어로 유닛(UR/U) 시스템으로 일원화

// v0.39.0 UR/U 결전 지휘관 전장 직접 강림(Hero Unit) 상태
let deployedHeroes = {};          // { [charId]: { x, y, cooldownSec: 0, maxCooldownSec: 15, auraRange: 1, attackCooldown: 0 } }
let heroDeployingCharId = null;    // 현재 전장 강림/전술 이동 조작 중인 지휘관 ID (null이면 미선택)

// v0.36.0 지휘관 고정 타워 스톡(Stock), 스마트 오버킬 방지 및 전투 통계
let commanderTowerStocks = {};     // 이번 판 출전 지휘관들로부터 제공된 타워별 총 스톡 { melee: 4, ranged: 3, ... }
let commanderTowerRemaining = {};  // 현재 필드에 추가 설치 가능한 잔여 타워 스톡
let pendingDamageMap = new Map();  // Map<enemyId, number> : 비행 중인 투사체 총 대미지 합산 (오버킬 방지용)
let battleStats = {                // 최종 전투 현황판(Battle Report)용 실시간 통계
    towers: {},                    // { ranged: { damage: 0, kills: 0, investedTP: 0 }, ... }
    commanders: {},                // { charId: { directDmg: 0, auraBuffDmg: 0 }, ... }
    totalDamage: 0,
    totalKills: 0,
    wastedOverkillDamage: 0
};

// [v0.44.0 New] 무료 기반(벽) 보급 수량 (수호자 2셋 시너지: 게임 시작 및 라운드마다 +1)
let freeBases = 0;

// [v0.44.0 New] 몬스터 고유 ID 발급 카운터 (스마트 오버킬 방지용 pendingDamageMap 키)
let enemyIdCounter = 0;

// [v0.44.0 New] 다음 웨이브 사전 확정 구성 (정비 시간 예고 UI 및 스폰에 사용)
let nextWavePlan = null; // { round, types: ['normal', 'fast', ...] }

// [v0.44.0 New] 성스러운 축복(공속 2배) 남은 틱 수
let frenzyTicksRemaining = 0;

// [v0.44.0 New] 스테이지 클리어(승리) 처리 여부
let stageCleared = false;
