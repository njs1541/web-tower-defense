let board = [];
let enemies = [];
let path = [];
let round = 1;
let playerHP = 10;
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
let deckTowerCaps = {    // 출전 캐릭터들로부터 계산된 타워별 최대 인게임 강화 가능 레벨
    ranged: 0,
    melee: 0,
    ice: 0,
    bomb: 0
};

// v0.25.0 지휘관 스타팅 무료 보급 인벤토리
let commanderSupplies = {}; // { melee: 2, ranged: 1, base: 2, ... }
let selectedSupplyType = null; // 무료 보급으로 설치 중인 타워/기반 키

// v0.32.0 대장 지휘관 인게임 직접 참전 & 기반 수호 상태
let leaderDeployed = false;            // 대장 필드 배치 여부
let leaderPos = null;                  // 대장이 서 있는 기반 좌표 { x, y }
let leaderRelocatedThisRound = false;  // 라운드당 1회 이동 사용 여부
let isLeaderDeployMode = false;        // 대장 강림/이동 타일 선택 모드
let leaderAttackCooldown = 0;          // 대장 자체 공격 쿨다운




