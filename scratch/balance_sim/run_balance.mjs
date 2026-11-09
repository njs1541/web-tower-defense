/*
 * 밸런스 측정 시뮬레이터 실행기 (v0.53.3)
 *
 * 실제 게임(index.html)을 Edge 헤드리스로 띄우고 CDP로 sim_page.js를 주입해 자동으로 판을 돌린다.
 * 가상 시계를 쓰므로 결과의 시간은 1배속 기준 실제 플레이 시간이다.
 *
 * 사용법 (프로젝트 루트에서):
 *   node scratch/balance_sim/run_balance.mjs                      # 전체 매트릭스 (프리셋 3 × 스테이지 3 × 10판)
 *   node scratch/balance_sim/run_balance.mjs --preset starter --stage 1 --runs 3
 *   옵션: --runs N (기본 10) --seed N (첫 시드, 기본 1) --prep 초 (라운드당 정비 시간 가정, 기본 15)
 *         --max-round N (기본 40) --port N (서버 포트, 기본 8085) --edge 경로
 *         --no-report (report.md를 덮어쓰지 않음, 회귀 확인용)  --from <결과 JSON> (판을 돌리지 않고 report.md만 재생성)
 *
 * 출력: scratch/balance_sim/results/<시각>.json, scratch/balance_sim/report.md (마지막 실행 요약)
 * 서버(scratch/serve.js)가 이미 떠 있으면 그대로 쓰고, 없으면 직접 띄웠다가 종료한다.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 인자 ----------
const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const OPT = {
    runs: Number(arg('runs', 10)),
    seed: Number(arg('seed', 1)),
    prepSec: Number(arg('prep', 15)),
    maxRound: Number(arg('max-round', 40)),
    port: Number(arg('port', 8085)),
    cdpPort: Number(arg('cdp-port', 9339)),
    edge: arg('edge', process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'),
    presets: arg('preset', 'starter,mid,strong').split(','),
    stages: arg('stage', '1,2,3').split(',').map(Number)
};
const BOT = { mazeShareEarly: 0.6, mazeShareLate: 0.3, roundTimeoutMs: 10 * 60 * 1000 };

// ---------- 덱 프리셋 ----------
// sockets = 기본 소켓 + (성급 - 1), 최대 소켓 이내. 룬은 장착 수만큼 보유로 넣는다.
const ch = (id, star, sockets, runes) => ({ id, star, starExp: 0, sockets, equippedRunes: runes });
const PRESETS = {
    // 신규 계정 기본 덱 (getDefaultStarterCharacters와 동일)
    starter: {
        label: '신규 (리아나 C★1 + 엘레나 UC★1)',
        deck: ['char_liana', 'char_elena'],
        characters: {
            char_liana: ch('char_liana', 1, 1, ['rune_flame']),
            char_elena: ch('char_elena', 1, 1, ['rune_spell_gold'])
        }
    },
    // 중반: UC★3 + UC★2 + SR★2, 하위 룬
    mid: {
        label: '중반 (엘레나 UC★3 + 세실리아 UC★2 + 스칼렛 SR★2)',
        deck: ['char_elena', 'char_cecilia', 'char_scarlet'],
        characters: {
            char_elena: ch('char_elena', 3, 2, ['rune_spell_gold', 'rune_critical']),
            char_cecilia: ch('char_cecilia', 2, 2, ['rune_spell_gust', 'rune_critical']),
            char_scarlet: ch('char_scarlet', 2, 3, ['rune_flame', 'rune_spell_thunder', 'rune_critical'])
        },
        talents: { startGold: 2, maxHp: 2, towerPower: 2 }
    },
    // 최강: U 히어로 + SR★5 2명, 상위 룬, 연구소 최대
    strong: {
        label: '최강 (루미나 U★3 + 셀레나 SR★5 + 엘레노어 SR★5, 연구소 최대)',
        deck: ['char_lumina', 'char_selena', 'char_eleanor'],
        characters: {
            char_lumina: ch('char_lumina', 3, 6, ['rune_void_collapse', 'rune_spell_armageddon', 'rune_spell_frenzy', 'rune_chain_lightning', 'rune_critical', 'rune_pierce']),
            char_selena: ch('char_selena', 5, 4, ['rune_critical', 'rune_pierce', 'rune_spell_thunder', 'rune_flame']),
            char_eleanor: ch('char_eleanor', 5, 4, ['rune_chain_lightning', 'rune_critical', 'rune_spell_gust', 'rune_flame'])
        },
        talents: { startGold: 5, maxHp: 5, towerPower: 5 }
    }
};
for (const p of Object.values(PRESETS)) {
    p.runes = Object.values(p.characters).flatMap(c => c.equippedRunes);
}

// ---------- 서버와 브라우저 ----------
async function isUp(url) { try { const r = await fetch(url); return r.ok; } catch { return false; } }

async function ensureServer() {
    const url = `http://localhost:${OPT.port}/index.html`;
    if (await isUp(url)) return null;
    const child = spawn(process.execPath, [path.join(ROOT, 'scratch', 'serve.js')], { cwd: ROOT, stdio: 'ignore' });
    for (let i = 0; i < 50; i++) { if (await isUp(url)) return child; await sleep(200); }
    child.kill();
    throw new Error('게임 서버를 띄우지 못했습니다 (scratch/serve.js)');
}

async function launchEdge() {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'td-sim-'));
    const child = spawn(OPT.edge, ['--headless=new', `--remote-debugging-port=${OPT.cdpPort}`, `--user-data-dir=${profile}`,
        '--no-first-run', '--disable-background-timer-throttling', 'about:blank'], { stdio: 'ignore' });
    let tabs = null;
    for (let i = 0; i < 60; i++) {
        try { tabs = await (await fetch(`http://127.0.0.1:${OPT.cdpPort}/json`)).json(); if (tabs.some(t => t.type === 'page')) break; } catch { /* 대기 */ }
        await sleep(250);
    }
    if (!tabs) throw new Error('Edge CDP에 연결하지 못했습니다');
    return { child, profile, page: tabs.find(t => t.type === 'page') };
}

function connect(wsUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        let id = 0; const pend = new Map(); const events = [];
        ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
            else if (m.method === 'Runtime.exceptionThrown') events.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
            else if (m.method === 'Page.loadEventFired') events.push('__load__');
        };
        ws.onerror = reject;
        ws.onopen = () => {
            const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
            const evaluate = async expr => {
                const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
                if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
                return r.result.result.value;
            };
            resolve({ ws, send, evaluate, events });
        };
    });
}

async function waitLoad(cdp) {
    for (let i = 0; i < 100; i++) {
        const idx = cdp.events.indexOf('__load__');
        if (idx >= 0) { cdp.events.splice(idx, 1); return; }
        await sleep(100);
    }
    throw new Error('페이지 로드 시간 초과');
}

// ---------- 1판 실행 ----------
async function runOne(cdp, presetKey, stageId, seed) {
    cdp.events.length = 0;
    // 쿼리를 바꿔 매 판 전체 로드를 강제한다 (해시만 바꾸면 같은 문서 내 이동이라 load가 오지 않음)
    await cdp.send('Page.navigate', { url: `http://localhost:${OPT.port}/index.html?simrun=${presetKey}-${stageId}-${seed}#seed=${seed}` });
    await waitLoad(cdp);
    await cdp.evaluate(`window.__bot.advance(500)`); // 로드 직후 초기화 타이머 소화
    const preset = PRESETS[presetKey];
    const setupInfo = await cdp.evaluate(`window.__bot.setup(${JSON.stringify(preset)}, ${stageId})`);

    const rounds = [];
    let st = await cdp.evaluate(`window.__bot.status()`);
    while (!st.gameOver && !st.stageCleared && st.round <= OPT.maxRound) {
        const r = await cdp.evaluate(`window.__bot.playRound(${JSON.stringify(BOT)})`);
        rounds.push(r);
        st = await cdp.evaluate(`window.__bot.status()`);
        if (r.timedOut) break;
    }
    const pageErrors = await cdp.evaluate(`window.__bot.errors.slice(0, 10)`);
    const combatMs = rounds.reduce((s, r) => s + r.combatMs, 0);
    const reached = rounds.length ? rounds[rounds.length - 1].round : 0;
    return {
        preset: presetKey, stage: stageId, seed,
        cleared: st.stageCleared, gameOver: st.gameOver, reachedRound: reached,
        timedOut: rounds.some(r => r.timedOut),
        combatMin: combatMs / 60000,
        totalMin: (combatMs + rounds.length * OPT.prepSec * 1000) / 60000,
        totalMin30: (combatMs + rounds.length * 30 * 1000) / 60000,
        perfectWaves: rounds.filter(r => r.hpLost === 0).length,
        rewards: { pp: st.pp, repeatPP: st.pp - st.firstClearPP, firstClearPP: st.firstClearPP, rp: st.rp, prismShards: st.prismShards, lobbyGold: st.lobbyGold },
        totalKills: st.totalKills,
        startInfo: setupInfo,
        rounds,
        pageErrors: [...pageErrors, ...cdp.events.filter(e => e !== '__load__').slice(0, 10)]
    };
}

// ---------- 집계 ----------
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const f1 = x => (Math.round(x * 10) / 10).toFixed(1);

function summarize(results) {
    const rows = [];
    for (const presetKey of OPT.presets) for (const stage of OPT.stages) {
        const rs = results.filter(r => r.preset === presetKey && r.stage === stage);
        if (!rs.length) continue;
        const cleared = rs.filter(r => r.cleared);
        rows.push({
            preset: presetKey, stage, runs: rs.length,
            clearRate: cleared.length / rs.length,
            reached: avg(rs.map(r => r.reachedRound)),
            totalMin: avg(rs.map(r => r.totalMin)),
            clearTotalMin: cleared.length ? avg(cleared.map(r => r.totalMin)) : null,
            clearTotalMin30: cleared.length ? avg(cleared.map(r => r.totalMin30)) : null,
            combatMin: avg(rs.map(r => r.combatMin)),
            pp: avg(rs.map(r => r.rewards.pp)), repeatPP: avg(rs.map(r => r.rewards.repeatPP)),
            shards: avg(rs.map(r => r.rewards.prismShards)),
            rp: avg(rs.map(r => r.rewards.rp)), gold: avg(rs.map(r => r.rewards.lobbyGold)),
            perfect: avg(rs.map(r => r.perfectWaves)),
            errors: rs.reduce((s, r) => s + r.pageErrors.length, 0),
            timeouts: rs.filter(r => r.timedOut).length
        });
    }
    return rows;
}

function reportMd(rows, meta) {
    const lines = [];
    lines.push('# 밸런스 측정 결과');
    lines.push('');
    lines.push(`- 실행: ${meta.when} / 게임 ${meta.version} / 판당 시드 ${meta.seedFrom}부터 / 소요 ${f1(meta.elapsedSec)}초`);
    lines.push(`- 시간은 1배속 기준. "총 시간" = 전투 시간 + 라운드당 정비 ${OPT.prepSec}초 가정.`);
    lines.push('- 봇은 사람보다 약하다. 클리어율과 도달 라운드는 하한선으로 읽는다.');
    lines.push('- 보상은 빈 세이브에서 시작한 판 하나의 획득량이다. "PP 전체"는 스테이지 최초 클리어 보너스를 포함하고, "PP 반복"은 그 보너스를 뺀 값(이미 클리어한 스테이지를 다시 할 때의 수급)이다. 조각 잔여는 100개 단위로 PP에 합성되고 남은 수.');
    lines.push('');
    lines.push('| 덱 | 스테이지 | 판 | 클리어율 | 평균 도달 R | 평균 총 시간(분) | 클리어 판 총 시간(분) | 클리어 판, 정비 30초(분) | 전투 시간(분) | 완막 웨이브 | PP 전체 | PP 반복 | 조각 잔여 | RP | 로비 골드 | 오류 |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    const opt = v => v == null ? '-' : f1(v);
    for (const r of rows) {
        lines.push(`| ${r.preset} | ${r.stage} | ${r.runs} | ${Math.round(r.clearRate * 100)}% | ${f1(r.reached)} | ${f1(r.totalMin)} | ${opt(r.clearTotalMin)} | ${opt(r.clearTotalMin30)} | ${f1(r.combatMin)} | ${f1(r.perfect)} | ${f1(r.pp)} | ${f1(r.repeatPP)} | ${f1(r.shards)} | ${f1(r.rp)} | ${Math.round(r.gold)} | ${r.errors}${r.timeouts ? ` (시간초과 ${r.timeouts})` : ''} |`);
    }
    lines.push('');
    lines.push('덱 구성:');
    for (const k of OPT.presets) lines.push(`- ${k}: ${PRESETS[k].label}`);
    lines.push('');
    return lines.join('\n');
}

// ---------- 메인 ----------
const started = Date.now();
const REPORT_PATH = path.join(HERE, 'report.md');
const NO_REPORT = argv.includes('--no-report');

// --from <결과 JSON>: 판을 돌리지 않고 저장된 결과로 report.md만 다시 만든다
const fromJson = arg('from', null);
if (fromJson) {
    const saved = JSON.parse(fs.readFileSync(fromJson, 'utf8'));
    Object.assign(OPT, { presets: saved.options.presets, stages: saved.options.stages, prepSec: saved.options.prepSec });
    const md = reportMd(summarize(saved.results), saved.meta);
    fs.writeFileSync(REPORT_PATH, md);
    console.log(md);
    process.exit(0);
}

const server = await ensureServer();
const edge = await launchEdge();
const cdp = await connect(edge.page.webSocketDebuggerUrl);
const cleanup = () => {
    try { cdp.ws.close(); } catch { /* 무시 */ }
    try { edge.child.kill(); } catch { /* 무시 */ }
    if (server) try { server.kill(); } catch { /* 무시 */ }
};
try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: fs.readFileSync(path.join(HERE, 'sim_page.js'), 'utf8') });

    const results = [];
    let seed = OPT.seed;
    for (const presetKey of OPT.presets) for (const stage of OPT.stages) {
        for (let i = 0; i < OPT.runs; i++, seed++) {
            const t = Date.now();
            const r = await runOne(cdp, presetKey, stage, seed);
            results.push(r);
            console.log(`[${presetKey} S${stage} #${i + 1} seed=${seed}] ${r.cleared ? '클리어' : (r.gameOver ? '패배' : '중단')} R${r.reachedRound} 총 ${f1(r.totalMin)}분 PP ${r.rewards.pp} RP ${r.rewards.rp} G ${r.rewards.lobbyGold} 오류 ${r.pageErrors.length} (${f1((Date.now() - t) / 1000)}초)`);
        }
    }
    const version = await cdp.evaluate('GAME_VERSION');
    const rows = summarize(results);
    const meta = { when: new Date().toISOString(), version, seedFrom: OPT.seed, elapsedSec: (Date.now() - started) / 1000 };
    const outDir = path.join(HERE, 'results');
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = meta.when.replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(outDir, `${stamp}.json`), JSON.stringify({ meta, options: OPT, bot: BOT, summary: rows, results }, null, 2));
    const md = reportMd(rows, meta);
    if (!NO_REPORT) fs.writeFileSync(REPORT_PATH, md);
    console.log('\n' + md);
} finally {
    cleanup();
}
