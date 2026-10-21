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

