/*
 * test/tools 공용 도우미 (v0.55.23, 에셋 플로우 회의 R01 시제품)
 * - PNG 읽기/쓰기: 외부 패키지 없이 node:zlib만 쓴다. 8비트 RGB/RGBA/회색만 지원한다.
 * - 헤드리스 Edge 실행과 CDP 연결: scratch/balance_sim/run_balance.mjs와 같은 방식이다.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- PNG ----------
export function decodePNG(file) {
    const b = fs.readFileSync(file);
    if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: PNG가 아니다`);
    let p = 8, w, h, ct, bd, inter;
    const idat = [];
    while (p < b.length) {
        const len = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + len);
        if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; inter = d[12]; }
        else if (type === 'IDAT') idat.push(d);
        p += 12 + len;
    }
    if (bd !== 8 || inter) throw new Error(`${file}: 8비트 비인터레이스 PNG만 지원 (bitDepth ${bd}, interlace ${inter})`);
    const bpp = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
    if (!bpp) throw new Error(`${file}: 지원하지 않는 색 형식 ${ct}`);
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const st = w * bpp, px = Buffer.alloc(w * h * bpp);
    for (let y = 0; y < h; y++) {
        const f = raw[y * (st + 1)];
        for (let x = 0; x < st; x++) {
            const r = raw[y * (st + 1) + 1 + x];
            const a = x >= bpp ? px[y * st + x - bpp] : 0, u = y ? px[(y - 1) * st + x] : 0, c = (x >= bpp && y) ? px[(y - 1) * st + x - bpp] : 0;
            let v;
            if (f === 0) v = r; else if (f === 1) v = r + a; else if (f === 2) v = r + u; else if (f === 3) v = r + ((a + u) >> 1);
            else { const q = a + u - c, pa = Math.abs(q - a), pb = Math.abs(q - u), pc = Math.abs(q - c); v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? u : c); }
            px[y * st + x] = v & 255;
        }
    }
    // RGBA로 통일
    const rgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        if (bpp === 4) px.copy(rgba, i * 4, i * 4, i * 4 + 4);
        else if (bpp === 3) { rgba[i * 4] = px[i * 3]; rgba[i * 4 + 1] = px[i * 3 + 1]; rgba[i * 4 + 2] = px[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
        else if (bpp === 2) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = px[i * 2]; rgba[i * 4 + 3] = px[i * 2 + 1]; }
        else { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = px[i]; rgba[i * 4 + 3] = 255; }
    }
    return { w, h, colorType: ct, hasAlpha: ct === 4 || ct === 6, rgba };
}

/** 배경 판정. 녹색 #00FF00 또는 마젠타 #FF00FF 크로마키, 또는 투명. 뷰어(loadChromaImage)와 같은 범위를 쓴다. */
export const CHROMA_RULE = {
    green: 'G > 150 그리고 R < 120 그리고 B < 120',
    magenta: 'R > 200 그리고 B > 200 그리고 G < 80',
    transparent: 'A < 20',
};
/**
 * 그림의 배경 종류(v0.55.72, R04 A-46): 테두리 픽셀 다수결로 'green' | 'magenta' | 'alpha'(투명) | 'none'(정할 수 없음).
 * 마젠타 배경 캐릭터는 녹색 의상이 있어서 마젠타를 쓰는 것이므로, 녹색을 배경으로 보면 그 의상이 지워진다.
 */
export function bgKeyOf(rgba, w, h) {
    let g = 0, m = 0, t = 0, n = 0;
    const look = i => { n++; const r = rgba[i * 4], gg = rgba[i * 4 + 1], b = rgba[i * 4 + 2], a = rgba[i * 4 + 3]; if (a < 20) t++; else if (gg > 150 && r < 120 && b < 120) g++; else if (r > 200 && b > 200 && gg < 80) m++; };
    for (let x = 0; x < w; x++) { look(x); look((h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { look(y * w); look(y * w + w - 1); }
    const best = Math.max(g, m, t);
    if (best < n * 0.5) return 'none';
    return best === t ? 'alpha' : best === g ? 'green' : 'magenta';
}
/** 배경 판정 함수. key가 green이면 녹색만, magenta면 마젠타만 배경으로 본다(투명은 항상 배경). none이면 예전처럼 둘 다 */
export function makeBgTest(key) {
    return (r, g, b, a) => a < 20 || (key !== 'magenta' && g > 150 && r < 120 && b < 120) || (key !== 'green' && r > 200 && b > 200 && g < 80);
}
/** 그림(decodePNG 결과)에 맞는 배경 판정 함수 */
export const bgTestFor = img => makeBgTest(bgKeyOf(img.rgba, img.w, img.h));

/** 배경 판정(배경 종류를 모를 때). 녹색과 마젠타를 모두 배경으로 본다. 그림이 있으면 bgTestFor(img)를 쓴다 */
export function isBackground(r, g, b, a) {
    if (a < 20) return true;
    if (g > 150 && r < 120 && b < 120) return true;
    if (r > 200 && b > 200 && g < 80) return true;
    return false;
}

// ---------- 서버와 Edge ----------
async function isUp(url) { try { const r = await fetch(url); return r.ok; } catch { return false; } }

export async function ensureServer(port = 8085) {
    const url = `http://localhost:${port}/index.html`;
    if (await isUp(url)) return null;
    const child = spawn(process.execPath, [path.join(ROOT, 'scratch', 'serve.js')], { cwd: ROOT, stdio: 'ignore' });
    for (let i = 0; i < 50; i++) { if (await isUp(url)) return child; await sleep(200); }
    child.kill();
    throw new Error('서버를 띄우지 못했습니다 (scratch/serve.js)');
}

export async function launchEdge(cdpPort = 9341) {
    const edge = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'td-asset-'));
    const child = spawn(edge, ['--headless=new', `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`,
        '--no-first-run', '--disable-background-timer-throttling', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
    let tabs = null;
    for (let i = 0; i < 60; i++) {
        try { tabs = await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json(); if (tabs.some(t => t.type === 'page')) break; } catch { /* 대기 */ }
        await sleep(250);
    }
    if (!tabs) throw new Error('Edge CDP에 연결하지 못했습니다');
    const page = tabs.find(t => t.type === 'page');
    const cdp = await connect(page.webSocketDebuggerUrl);
    const close = () => {
        try { cdp.ws.close(); } catch { /* 무시 */ }
        child.kill();
        setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* 잠금 해제 전이면 남긴다 */ } }, 1000);
    };
    return { cdp, close };
}

function connect(wsUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        let id = 0; const pend = new Map(); const events = []; const errors = [];
        ws.onmessage = e => {
            const m = JSON.parse(e.data);
            if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
            else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
            else if (m.method === 'Page.loadEventFired') events.push('__load__');
        };
        ws.onerror = reject;
        ws.onopen = async () => {
            const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
            const evaluate = async expr => {
                const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
                if (r.error) throw new Error(r.error.message);
                if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
                return r.result.result.value;
            };
            const navigate = async url => {
                events.length = 0;
                await send('Page.navigate', { url });
                for (let i = 0; i < 150; i++) { if (events.includes('__load__')) return; await sleep(100); }
                throw new Error(`페이지 로드 시간 초과: ${url}`);
            };
            await send('Page.enable'); await send('Runtime.enable');
            resolve({ ws, send, evaluate, navigate, errors });
        };
    });
}

/** 페이지 안에서 조건식이 참이 될 때까지 기다린다 */
export async function waitFor(cdp, expr, timeoutMs = 30000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
        if (await cdp.evaluate(`!!(${expr})`)) return;
        await sleep(150);
    }
    throw new Error(`대기 시간 초과: ${expr}`);
}

export function saveDataUrl(dataUrl, file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(file, buf);
    return buf.length;
}

// ---------- 연결 덩어리 (v0.55.29, A-07 변경·A-21 공용) ----------
/** 전경 마스크(Uint8Array, 1 = 그림)를 8방향 연결 덩어리로 나눈다. 반환: { labels(Int32Array), comps: [{id, area, x0, y0, x1, y1}] } */
export function components(mask, w, h) {
    const labels = new Int32Array(w * h).fill(-1), comps = [], stack = new Int32Array(w * h);
    for (let s = 0; s < w * h; s++) {
        if (!mask[s] || labels[s] >= 0) continue;
        const id = comps.length; let sp = 0, area = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
        stack[sp++] = s; labels[s] = id;
        while (sp) {
            const p = stack[--sp], x = p % w, y = (p / w) | 0; area++;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
                const q = yy * w + xx; if (mask[q] && labels[q] < 0) { labels[q] = id; stack[sp++] = q; }
            }
        }
        comps.push({ id, area, x0, y0, x1, y1 });
    }
    return { labels, comps };
}

/** 두 덩어리 사이 최소 거리(px). 경계 픽셀끼리 비교하며 limit 이상이면 limit을 돌려준다. */
export function componentGap(labels, w, a, b, limit = 200) {
    const bx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), by = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
    if (Math.hypot(bx, by) >= limit) return limit;
    const edge = c => {
        const pts = [];
        for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
            const i = y * w + x; if (labels[i] !== c.id) continue;
            if (x === c.x0 || x === c.x1 || y === c.y0 || y === c.y1 || labels[i - 1] !== c.id || labels[i + 1] !== c.id || labels[i - w] !== c.id || labels[i + w] !== c.id) pts.push(x, y);
        }
        return pts;
    };
    const pa = edge(a), pb = edge(b); let best = limit * limit;
    for (let i = 0; i < pa.length; i += 2) for (let j = 0; j < pb.length; j += 2) {
        const d = (pa[i] - pb[j]) ** 2 + (pa[i + 1] - pb[j + 1]) ** 2; if (d < best) best = d;
    }
    return Math.sqrt(best);
}
