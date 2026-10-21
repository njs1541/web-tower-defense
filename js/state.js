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
let interactionMode = 'none'; // 'none', 'build', 'unlock'

let spawnedCount = 0;
let totalEnemies = 0;

// 배속 및 일시정지 상태 (Phase A)
let gameSpeed = 1; // 1: 기본속도, 2: 2배속
let isPaused = false; // 일시정지 여부
let selectedBoardTower = null; // 필드에서 선택된 타워 {x, y, tower}

// 스테이지 관리 (Phase D)
let currentStage = 1;
