/*
 * 밸런스 측정 시뮬레이터 - 페이지 주입 스크립트 (v0.53.3)
 * run_balance.mjs가 CDP Page.addScriptToEvaluateOnNewDocument로 게임 스크립트보다 먼저 주입한다.
 *
 * 1) 가상 시계: setTimeout / setInterval / Date.now를 가상 시간으로 교체한다.
 *    게임은 1배속(gameSpeed = 1) 그대로 돌지만 실제 대기 없이 CPU 속도로 진행되므로,
 *    측정한 가상 시간이 곧 1배속 플레이 시간이다. (고배속은 투사체 명중 지연 하한 50ms 때문에 밸런스가 왜곡된다)
 * 2) 시드 난수: URL 해시 #seed=N 이 있으면 Math.random을 고정 시드 난수로 바꿔 판을 재현할 수 있게 한다.
 * 3) 자동 플레이 봇(window.__bot): 정비 시간 행동(타워 배치, 히어로 강림, 미로 확장, 강화)과 전투 중 스펠 사용.
 *
 * 게임 코드(js/)는 수정하지 않고 전역 함수만 호출한다. 게임에 포함되지 않는 측정 도구다.
 */
(function () {
    'use strict';

    // ---------- 시드 난수 ----------
    const seedMatch = /seed=(\d+)/.exec(location.hash || '');
    if (seedMatch) {
        let s = Number(seedMatch[1]) >>> 0;
        Math.random = function () { // mulberry32
            s = (s + 0x6D2B79F5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // ---------- 세이브 격리 ----------
    try { localStorage.clear(); } catch (e) { /* 무시 */ }

    // ---------- 대화상자 무력화 ----------
    const dialogLog = [];
    window.alert = msg => { dialogLog.push(String(msg)); };
    window.confirm = msg => { dialogLog.push(String(msg)); return true; };

    // ---------- 가상 시계 ----------
    const timers = new Map();
    let now = 0, seq = 0, nextId = 1;
    const errors = [];
    function addTimer(fn, delay, args, repeat) {
        const id = nextId++;
        const d = Math.max(0, Number(delay) || 0);
        timers.set(id, { id, fn, args, at: now + d, every: repeat ? Math.max(1, d) : 0, seq: seq++ });
        return id;
    }
    window.setTimeout = (fn, delay, ...args) => addTimer(fn, delay, args, false);
    window.setInterval = (fn, delay, ...args) => addTimer(fn, delay, args, true);
    window.clearTimeout = window.clearInterval = id => { timers.delete(id); };
    const realDateNow = Date.now.bind(Date);
    const dateBase = realDateNow();
    Date.now = () => dateBase + now;

    function nextDue(end) {
        let best = null;
        for (const t of timers.values()) {
            if (t.at > end) continue;
            if (!best || t.at < best.at || (t.at === best.at && t.seq < best.seq)) best = t;
        }
        return best;
    }
    function advance(ms) {
        const end = now + ms;
        for (;;) {
            const t = nextDue(end);
            if (!t) break;
            now = t.at;
            if (t.every) { t.at += t.every; t.seq = seq++; } else { timers.delete(t.id); }
            try {
                if (typeof t.fn === 'function') t.fn(...t.args); else (0, eval)(String(t.fn));
            } catch (e) {
                if (errors.length < 50) errors.push(String((e && e.stack) || e));
            }
        }
        now = end;
    }

    // ---------- 봇 유틸 ----------
    const isHeroCell = (x, y) => Object.values(deployedHeroes).some(h => h && h.x === x && h.y === y);
    const pathKeySet = () => new Set((path || []).map(p => `${p.x},${p.y}`));

    function coverage(x, y, range) {
        let n = 0;
        for (const p of path || []) {
            if (Math.hypot(p.x - x, p.y - y) <= range + 0.35) n++;
        }
        return n;
    }

    // 지정 칸에 기반 건설 (게임의 실제 클릭 처리 경로를 사용)
    function buildBase(x, y) {
        const before = getCell(x, y).buildable;
        interactionMode = 'base';
        handleCellClick(x, y);
        interactionMode = 'none';
        return !before && getCell(x, y).buildable;
    }

    function placeTower(towerId, x, y) {
        selectTower(towerId);
        handleCellClick(x, y);
        if (interactionMode !== 'none') resetSelection();
        return getCell(x, y).tower === towerId;
    }

    // 경로 밖이면서 건설 가능한 칸 (경로를 바꾸지 않는 타워 자리 후보)
    function offPathBuildableCells() {
        const keys = pathKeySet();
        return board.filter(c => !keys.has(`${c.x},${c.y}`) && canBuildBaseAt(c.x, c.y));
    }

    function towerRange(towerId) {
        const t = TOWER_DATA[towerId];
        return t ? t.range : 2;
    }

    // 1) 타워 배치: 남은 스톡을 경로 커버리지가 가장 높은 자리에 설치
    function placeAllTowers(log) {
        let placed = 0;
        for (const towerId of Object.keys(commanderTowerRemaining)) {
            let guard = 20;
            while ((commanderTowerRemaining[towerId] || 0) > 0 && guard-- > 0) {
                const r = towerRange(towerId);
                // 빈 기반 (TP가 들지 않으므로 우선)
                let bestOld = null;
                for (const c of board) {
                    if (!c.buildable || c.tower || isHeroCell(c.x, c.y)) continue;
                    const s = coverage(c.x, c.y, r);
                    if (!bestOld || s > bestOld.s) bestOld = { c, s, existing: true };
                }
                // 새 기반 후보 (경로 밖). 빈 기반보다 커버리지가 2 이상 높을 때만 새로 짓는다.
                let bestNew = null;
                const baseCost = (freeBases > 0) ? 0 : getBaseBuildCost();
                if (gold >= baseCost) {
                    for (const c of offPathBuildableCells()) {
                        const s = coverage(c.x, c.y, r);
                        if (!bestNew || s > bestNew.s) bestNew = { c, s, existing: false };
                    }
                }
                let best = bestOld;
                if (bestNew && (!best || best.s === 0 || bestNew.s >= best.s + 2)) best = bestNew;
                if (!best || best.s === 0) { log.push(`stop:${towerId}:nocand`); break; }
                if (!best.existing && !buildBase(best.c.x, best.c.y)) { log.push(`stop:${towerId}:base@${best.c.x},${best.c.y}`); break; }
                if (!placeTower(towerId, best.c.x, best.c.y)) { log.push(`stop:${towerId}:place@${best.c.x},${best.c.y}`); break; }
                placed++;
            }
        }
        if (placed) log.push(`tower+${placed}`);
    }

    // 2) 히어로 강림: 타워가 가장 많이 들어오는 3x3 중심의 빈 기반
    function deployHeroes(log) {
        for (const charId of USER_DATA.characterDeck || []) {
            const ci = CHARACTER_DATA[charId];
            if (!ci || !(ci.grade === 'UR' || ci.grade === 'U')) continue;
            if (deployedHeroes[charId]) continue;
            let best = null;
            for (const c of board) {
                if (!c.buildable || c.tower || isHeroCell(c.x, c.y)) continue;
                let n = 0;
                for (const t of board) if (t.tower && Math.abs(t.x - c.x) <= 1 && Math.abs(t.y - c.y) <= 1) n++;
                const s = n * 100 + coverage(c.x, c.y, 2.5);
                if (!best || s > best.s) best = { c, s };
            }
            if (!best) {
                const cands = offPathBuildableCells();
                let bc = null;
                for (const c of cands) { const s = coverage(c.x, c.y, 2.5); if (!bc || s > bc.s) bc = { c, s }; }
                if (bc && buildBase(bc.c.x, bc.c.y)) best = bc;
            }
            if (best) {
                handleHeroDeployClick(best.c, charId);
                if (deployedHeroes[charId]) log.push(`hero:${charId}`);
            }
        }
    }

    // 3) 미로 확장: 지그재그 가로벽. 출발(맨 윗줄)·도착(맨 아랫줄) 보호구역을 피해 3줄 간격으로 벽을 세우고
    //    통로를 양 끝에 번갈아 1칸 남긴다. 위쪽 벽부터, 통로 반대편 끝에서 통로 쪽으로 쌓는다.
    //    (칸 하나를 막아도 같은 길이의 우회로가 생기므로, 한 칸씩 경로 이득을 보는 탐욕 방식은 쓰지 않는다)
    const WALL_ROWS = [3, 6, 9, 12, 15];
    function mazePlan() {
        const cells = [];
        WALL_ROWS.forEach((y, k) => {
            const gapLeft = (k % 2 === 0) === (startPos.x >= boardSize / 2); // 첫 벽 통로는 출발점 반대편
            const xs = [];
            for (let x = 0; x < boardSize; x++) {
                if (gapLeft && x === 0) continue;
                if (!gapLeft && x === boardSize - 1) continue;
                xs.push(x);
            }
            if (gapLeft) xs.reverse(); // 통로 반대편(오른쪽)부터
            for (const x of xs) cells.push({ x, y });
        });
        return cells;
    }
    function extendMaze(budget, log) {
        let spent = 0, built = 0;
        for (const p of mazePlan()) {
            const c = getCell(p.x, p.y);
            if (!c || c.buildable || !canBuildBaseAt(p.x, p.y)) continue;
            const cost = (freeBases > 0) ? 0 : getBaseBuildCost();
            if (cost > gold || spent + cost > budget) break;
            if (!buildBase(p.x, p.y)) continue;
            spent += cost; built++;
        }
        if (built) log.push(`maze+${built}`);
    }

    // 4) 강화: 커버리지 × 공격력이 높은 타워부터, 낮은 레벨 우선
    function upgradeTowers(log) {
        let ups = 0;
        for (let guard = 0; guard < 200; guard++) {
            let best = null;
            for (const c of board) {
                if (!c.tower) continue;
                if (c._simCapped) continue;
                const cost = calculateTowerUpgradeCost(c);
                if (cost > gold) continue;
                const t = TOWER_DATA[c.tower];
                const s = coverage(c.x, c.y, t.range) * (t.damage || 1) / (1 + (c.inGameLevel || 0));
                if (!best || s > best.s) best = { c, s };
            }
            if (!best) break;
            const lv = best.c.inGameLevel || 0;
            selectedBoardTower = best.c;
            upgradeSelectedTower();
            if ((best.c.inGameLevel || 0) === lv) best.c._simCapped = true; // 한도 도달
            else ups++;
        }
        if (ups) log.push(`up+${ups}`);
    }

    // 전투 중 스펠 사용
    function combatSpells() {
        const alive = enemies.filter(e => e.alive);
        if (alive.length === 0) return;
        const bossAlive = alive.some(e => e.isBoss);
        for (const item of getEquippedSpellRunes()) {
            const r = item.runeInfo;
            if ((mp || 0) < r.mpCost) continue;
            if (r.usageType === 'single') {
                if (usedSpellRunes[item.runeId]) continue;
                if (!bossAlive && playerHP > 3) continue;
            } else if (item.runeId !== 'rune_spell_gold' && alive.length < 3 && !bossAlive) {
                continue;
            }
            castSpellRune(item);
        }
    }

    // ---------- 판 진행 API ----------
    window.__bot = {
        errors, dialogLog,
        now: () => now,
        advance,

        // 덱 프리셋 주입 (loadData 이후, startGame 이전에 호출)
        setup(preset, stageId) {
            USER_DATA.characters = preset.characters;
            USER_DATA.characterDeck = preset.deck;
            USER_DATA.runes = preset.runes;
            USER_DATA.talents = Object.assign({ startGold: 0, maxHp: 0, towerPower: 0 }, preset.talents || {});
            USER_DATA.pp = 0; USER_DATA.rp = 0; USER_DATA.prismShards = 0; USER_DATA.gold = 0;
            USER_DATA.stageFirstClears = {};
            USER_DATA.tutorialDone = true; // 튜토리얼 안내 상자 생략 (v0.53.8)
            selectStage(stageId);
            startGame();
            return { stage: currentStage, deck: USER_DATA.characterDeck, gold, playerHP };
        },

        // 정비 → 전투 1라운드 진행. 전투 시간(가상 ms)과 라운드 결과를 돌려준다.
        playRound(opts) {
            const log = [];
            const r = round;
            const mazeShare = r <= 10 ? opts.mazeShareEarly : opts.mazeShareLate;
            // 미로 일부 → 타워(벽 기반 재활용) → 히어로 → 강화 → 남은 TP는 미로에 전부 → 새 자리에 타워
            extendMaze(Math.floor(gold * mazeShare), log);
            placeAllTowers(log);
            deployHeroes(log);
            upgradeTowers(log);
            extendMaze(gold, log);
            placeAllTowers(log);

            const hp0 = playerHP, kills0 = battleStats.totalKills || 0;
            const t0 = now;
            startRound();
            let guard = 0;
            const maxMs = opts.roundTimeoutMs;
            while (gameRunning && playerHP > 0 && now - t0 < maxMs) {
                advance(1000);
                combatSpells();
                guard++;
            }
            advance(1000); // 라운드 종료 후 지연 처리(알림 setTimeout 등) 소화
            return {
                round: r,
                combatMs: now - t0 - 1000,
                timedOut: gameRunning && now - t0 >= maxMs,
                hpLost: hp0 - playerHP,
                hp: playerHP,
                kills: (battleStats.totalKills || 0) - kills0,
                goldAfter: gold,
                pathLen: (path || []).length,
                towers: board.filter(c => c.tower).length,
                bases: board.filter(c => c.buildable).length,
                actions: log.join(' ')
            };
        },

        _debug: { placeAllTowers, extendMaze, upgradeTowers, coverage, offPathBuildableCells },

        status() {
            // 스테이지 최초 클리어 보너스 PP (enemy.js 라운드 종료 처리와 같은 규칙: 30R 10, 20R 5, 그 외 3)
            let firstClearPP = 0;
            for (const key of Object.keys(USER_DATA.stageFirstClears || {})) {
                const rr = Number(key.split('_').pop());
                firstClearPP += rr === 30 ? 10 : (rr === 20 ? 5 : 3);
            }
            return {
                firstClearPP,
                round, playerHP, gameOver: playerHP <= 0, stageCleared: !!stageCleared,
                pp: USER_DATA.pp, rp: USER_DATA.rp, prismShards: USER_DATA.prismShards, lobbyGold: USER_DATA.gold,
                totalKills: battleStats.totalKills || 0
            };
        }
    };
})();
