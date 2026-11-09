/*
 * 지휘관 썸네일 생성기 (v0.53.7, 워크플로 P2-2)
 * CHARACTER_DATA의 각 원화(image)를 짧은 변 240px WebP로 줄여 assets/thumbs/<지휘관 id>.webp에 저장한다.
 * 외부 이미지 도구 없이 Edge 헤드리스의 canvas로 변환한다. 지휘관을 추가하면 다시 실행한다.
 *
 * 사용법 (프로젝트 루트): node scratch/make_thumbs.mjs [--force] [--size 240] [--quality 0.82]
 *   기본은 썸네일이 없거나 원화보다 오래된 것만 만든다. --force는 전부 다시 만든다.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const SIZE = Number(arg('size', 240));
const QUALITY = Number(arg('quality', 0.82));
const FORCE = argv.includes('--force');
const PORT = 8085, CDP = 9343;
const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// constants.js에서 CHARACTER_DATA만 읽는다
const src = fs.readFileSync(path.join(ROOT, 'js', 'constants.js'), 'utf8');
const CHARACTER_DATA = new Function(src + '; return CHARACTER_DATA;')();
const OUT_DIR = path.join(ROOT, 'assets', 'thumbs');
fs.mkdirSync(OUT_DIR, { recursive: true });

const jobs = [];
for (const [id, c] of Object.entries(CHARACTER_DATA)) {
    if (!c.image) continue;
    const srcPath = path.join(ROOT, c.image.split('?')[0]);
    const outPath = path.join(OUT_DIR, `${id}.webp`);
    if (!fs.existsSync(srcPath)) { console.warn(`원화 없음: ${id} ${c.image}`); continue; }
    if (!FORCE && fs.existsSync(outPath) && fs.statSync(outPath).mtimeMs >= fs.statSync(srcPath).mtimeMs) continue;
    jobs.push({ id, url: '/' + c.image.split('?')[0], outPath });
}
if (!jobs.length) { console.log('새로 만들 썸네일이 없습니다.'); process.exit(0); }

async function isUp() { try { return (await fetch(`http://localhost:${PORT}/index.html`)).ok; } catch { return false; } }
let server = null;
if (!(await isUp())) {
    server = spawn(process.execPath, [path.join(ROOT, 'scratch', 'serve.js')], { cwd: ROOT, stdio: 'ignore' });
    for (let i = 0; i < 50 && !(await isUp()); i++) await sleep(200);
}
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'td-thumb-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
try {
    let tabs = null;
    for (let i = 0; i < 60; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json(); if (tabs.some(t => t.type === 'page')) break; } catch { /* 대기 */ } await sleep(250); }
    const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 0; const pend = {};
    ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } };
    const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
    // 같은 출처 페이지에서 그려야 canvas를 읽을 수 있다
    await send('Page.enable');
    await send('Page.navigate', { url: `http://localhost:${PORT}/scratch/serve.js` });
    await sleep(800);
    let total = 0;
    for (const job of jobs) {
        const expr = `new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const scale = ${SIZE} / Math.min(img.naturalWidth, img.naturalHeight);
                const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
                const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                const ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, w, h);
                resolve({ w, h, data: cv.toDataURL('image/webp', ${QUALITY}) });
            };
            img.onerror = () => reject(new Error('로드 실패'));
            img.src = ${JSON.stringify(job.url)};
        })`;
        const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) { console.error(`실패: ${job.id}`, r.result.exceptionDetails.exception?.description); continue; }
        const { w, h, data } = r.result.result.value;
        if (!data.startsWith('data:image/webp')) { console.error(`WebP 인코딩 실패: ${job.id}`); continue; }
        const buf = Buffer.from(data.split(',')[1], 'base64');
        fs.writeFileSync(job.outPath, buf);
        total += buf.length;
        console.log(`${job.id}: ${w}x${h} ${(buf.length / 1024).toFixed(1)}KB`);
    }
    console.log(`완료 ${jobs.length}개, 합계 ${(total / 1024).toFixed(1)}KB`);
    await send('Browser.close').catch(() => {});
} finally {
    try { edge.kill(); } catch { /* 무시 */ }
    if (server) try { server.kill(); } catch { /* 무시 */ }
}
