/*
 * 파츠 시트 후처리·합성 (v0.55.71, R04 A-45·A-47)
 *
 * 파츠를 하나씩 따로 생성한 뒤(A-47) 기존 시트에 넣거나 바꿀 때 쓰는 공통 도구다. 리아나 REQ03-05에서 Gemini가 매번 PowerShell로
 * 하던 공통 단계를 모았다. 파츠별 그림 수정(손목 자르기, 소매 아래 살 지우기 등)은 캐릭터마다 달라 이 도구가 하지 않는다.
 *   1) 원본 읽기: PNG는 바로, JPG·WebP는 헤드리스 Edge로 해독한다(외부 패키지 없음).
 *   2) 배경 정리: 녹색(#00FF00)·마젠타(#FF00FF) 배경을 판정해 가장 큰 덩어리(또는 지정 상자)를 파츠로 잡는다.
 *   3) 균일 배율·회전: 가로세로 같은 배율 하나만 쓴다(사양 2.1절). 배경을 섞지 않는 보간(전경 가중), 테두리 색 번짐 제거.
 *   4) 시트에 넣기: replace(기존 파츠 자리), add(맨 끝 순서로 빈자리), remove. 다른 파츠 픽셀은 그대로 둔다.
 *   5) 기록: 출력 시트가 있으면 <시트>_v<다음 번호>.png로 백업, 파츠별 배율·자리를 compose_log.json에 쌓는다(A-47 배율 기록).
 * 표정 윤곽 통일(A-45 선택 기능)은 아직 없다. 표정 납품 때 실제 그림으로 만든다.
 *
 * 사용법 (프로젝트 루트): node test/tools/compose_sheet.mjs <작업.json> [--no-backup]
 * 작업 파일 예:
 * {
 *   "base": "test/incoming/char_x/sheet4_legs_weapons.png",   // 기준 시트(없으면 빈 1024 배경)
 *   "out": "test/incoming/char_x/sheet4_legs_weapons.png",    // 결과(같은 파일이면 기존 것을 _vN으로 백업 후 덮어씀)
 *   "bg": "auto",                                             // auto(기준 시트 테두리) | green | magenta
 *   "ops": [
 *     { "replace": 5, "src": "생성.jpg", "scale": { "maxSide": 68 } },             // 5번 파츠(읽는 순서)를 새 그림으로. 자리는 기존 가운데
 *     { "add": true, "src": "새.png", "scale": { "match": { "sheet": "...sheet3_arms.png", "part": 2, "side": "height" } }, "rotate": 0 },
 *     { "remove": 3 }
 *   ]
 * }
 * scale: 숫자(배율) | { "maxSide": px } | { "height": px } | { "width": px } | { "match": { sheet, part, side: height|width|maxSide, ratio } }
 * 선택: "crop": [x, y, w, h](원본에서 파츠 상자 지정), "center": [x, y](넣을 자리), "rotate": 도(시계 방향)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, decodePNG, bgTestFor, components, componentGap, launchEdge } from './lib.mjs';
import { encodePNG } from '../../scratch/pixelfx/tools/lib/png.mjs';
const Fit = createRequire(import.meta.url)('../proto/fit_core.js');

const args = process.argv.slice(2);
if (!args[0] || !fs.existsSync(args[0])) { console.log('사용법: node test/tools/compose_sheet.mjs <작업.json> [--no-backup]'); process.exit(2); }
const job = JSON.parse(fs.readFileSync(args[0], 'utf8')), NO_BACKUP = args.includes('--no-backup');
const abs = p => path.isAbsolute(p) ? p : path.join(ROOT, p);
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const SIZE = 1024, GAP = 40, EDGE_MARGIN = 8, MIN_AREA = 150;

// ---------- 이미지 읽기 (RGB 배열 {w, h, px: Uint8Array w*h*3}) ----------
let edge = null;
async function readImage(file) {
    if (/\.png$/i.test(file)) { const im = decodePNG(file); return toRGB(im); }
    if (!edge) edge = await launchEdge(9342); // about:blank에서 시작한다
    const mime = /\.webp$/i.test(file) ? 'image/webp' : 'image/jpeg';
    const data = 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64');
    // 픽셀 배열을 JSON으로 넘기면 1024x1024에서 수백 MB가 되어 멈춘다. 브라우저에서 PNG로 다시 인코딩해 넘긴다
    const url = await edge.cdp.evaluate(`new Promise((res, rej) => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); res(c.toDataURL('image/png')); }; i.onerror = () => rej('해독 실패'); i.src = ${JSON.stringify(data)}; })`);
    const tmp = path.join(path.dirname(abs(args[0])), `_decode_${process.pid}.png`);
    fs.writeFileSync(tmp, Buffer.from(url.split(',')[1], 'base64'));
    try { return toRGB(decodePNG(tmp)); } finally { fs.rmSync(tmp, { force: true }); }
}
function toRGB(im) {
    const px = new Uint8Array(im.w * im.h * 3), bg = new Uint8Array(im.w * im.h), isBackground = bgTestFor(im); // 그 그림의 배경색만(v0.55.72)
    for (let i = 0; i < im.w * im.h; i++) {
        const r = im.rgba[i * 4], g = im.rgba[i * 4 + 1], b = im.rgba[i * 4 + 2], a = im.rgba[i * 4 + 3];
        px[i * 3] = r; px[i * 3 + 1] = g; px[i * 3 + 2] = b; bg[i] = isBackground(r, g, b, a) ? 1 : 0;
    }
    return { w: im.w, h: im.h, px, bg };
}

// ---------- 시트 파츠 (읽는 순서 번호) ----------
function sheetParts(im) {
    const m = new Uint8Array(im.w * im.h); for (let i = 0; i < m.length; i++) m[i] = 1 - im.bg[i];
    const { labels, comps } = components(m, im.w, im.h);
    const parts = comps.filter(c => c.area >= MIN_AREA);
    const order = Fit.readingOrder(parts.map(c => ({ x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1 })));
    return { labels, parts: order.map(i => parts[i]) }; // parts[0]이 1번
}

// ---------- 배경 판정 색 ----------
function bgColorOf(im) {
    let g = 0, m = 0;
    for (let x = 0; x < im.w; x++) for (const y of [0, im.h - 1]) { const i = (y * im.w + x) * 3; if (im.px[i + 1] > 150 && im.px[i] < 120) g++; else if (im.px[i] > 200 && im.px[i + 2] > 200) m++; }
    return m > g ? [255, 0, 255] : [0, 255, 0];
}

// ---------- 파츠 떼기와 변환 ----------
function extract(src, crop) {
    let box;
    if (crop) box = { x0: crop[0], y0: crop[1], x1: crop[0] + crop[2] - 1, y1: crop[1] + crop[3] - 1 };
    else {
        const { parts } = sheetParts(src);
        if (!parts.length) throw new Error('원본에서 파츠를 찾지 못했다');
        box = parts.reduce((a, b) => (b.area > a.area ? b : a)); // 가장 큰 덩어리
    }
    return box;
}
/** 색 번짐 제거: 녹색은 G가 max(R,B)를 넘는 만큼, 마젠타는 min(R,B)가 G를 넘는 만큼 뺀다 */
function despill(r, g, b, magentaSrc) {
    if (magentaSrc) { const s = Math.min(r, b) - g - 8; if (s > 0) { r -= s; b -= s; } }
    else { const s = g - Math.max(r, b) - 8; if (s > 0) g -= s; }
    return [r, g, b];
}
/** 원본 상자를 배율 k, 회전 rot도로 바꿔 RGBA(투명 배경) 그림으로 만든다. 전경만 가중 평균(배경색이 섞이지 않음), 덮임 0.45 이상만 칠한다 */
function transform(src, box, k, rot, magentaSrc) {
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1, r = rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const hw = bw * k / 2, hh = bh * k / 2, W = Math.ceil(Math.abs(c) * hw * 2 + Math.abs(s) * hh * 2) + 2, H = Math.ceil(Math.abs(s) * hw * 2 + Math.abs(c) * hh * 2) + 2;
    const out = new Uint8Array(W * H * 4), cx = box.x0 + bw / 2, cy = box.y0 + bh / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - W / 2, dy = y + 0.5 - H / 2; // 대상 → 원본(역회전, 역배율)
        const sx = (c * dx + s * dy) / k + cx - 0.5, sy = (-s * dx + c * dy) / k + cy - 0.5;
        const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
        let R = 0, G = 0, B = 0, Wt = 0;
        for (const [ox, oy, wt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
            const X = ix + ox, Y = iy + oy;
            if (X < box.x0 || Y < box.y0 || X > box.x1 || Y > box.y1 || wt <= 0) continue;
            const i = Y * src.w + X; if (src.bg[i]) continue;
            R += src.px[i * 3] * wt; G += src.px[i * 3 + 1] * wt; B += src.px[i * 3 + 2] * wt; Wt += wt;
        }
        if (Wt < 0.45) continue;
        const [rr, gg, bb] = despill(R / Wt, G / Wt, B / Wt, magentaSrc), o = (y * W + x) * 4;
        out[o] = Math.round(rr); out[o + 1] = Math.round(gg); out[o + 2] = Math.round(bb); out[o + 3] = 255;
    }
    return { w: W, h: H, rgba: out };
}

// ---------- 실행 ----------
const outFile = abs(job.out), baseFile = job.base ? abs(job.base) : null;
let sheet;
if (baseFile && fs.existsSync(baseFile)) sheet = await readImage(baseFile);
else sheet = { w: SIZE, h: SIZE, px: new Uint8Array(SIZE * SIZE * 3), bg: new Uint8Array(SIZE * SIZE).fill(1) };
const BG = job.bg === 'magenta' ? [255, 0, 255] : job.bg === 'green' ? [0, 255, 0] : (baseFile ? bgColorOf(sheet) : [0, 255, 0]);
for (let i = 0; i < sheet.w * sheet.h; i++) if (sheet.bg[i]) sheet.px.set(BG, i * 3); // 배경을 순수 단색으로
const log = [];
const erase = comp => {
    const { labels } = sheetParts(sheet);
    for (let y = Math.max(0, comp.y0 - 2); y <= Math.min(sheet.h - 1, comp.y1 + 2); y++) for (let x = Math.max(0, comp.x0 - 2); x <= Math.min(sheet.w - 1, comp.x1 + 2); x++) {
        const i = y * sheet.w + x; let near = labels[i] === comp.id;
        for (let d = -2; d <= 2 && !near; d++) for (let e = -2; e <= 2 && !near; e++) { const q = (y + d) * sheet.w + x + e; if (q >= 0 && q < labels.length && labels[q] === comp.id) near = true; }
        if (near) { sheet.px.set(BG, i * 3); sheet.bg[i] = 1; }
    }
};
async function scaleOf(spec, box) {
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    if (typeof spec === 'number') return spec;
    if (!spec) return 1;
    if (spec.maxSide) return spec.maxSide / Math.max(bw, bh);
    if (spec.height) return spec.height / bh;
    if (spec.width) return spec.width / bw;
    if (spec.match) {
        const ref = await readImage(abs(spec.match.sheet)), p = sheetParts(ref).parts[spec.match.part - 1];
        if (!p) throw new Error(`match: ${spec.match.sheet}에 ${spec.match.part}번 파츠가 없다`);
        const pw = p.x1 - p.x0 + 1, ph = p.y1 - p.y0 + 1, side = spec.match.side || 'maxSide', ratio = spec.match.ratio || 1;
        const v = side === 'height' ? ph / bh : side === 'width' ? pw / bw : Math.max(pw, ph) / Math.max(bw, bh);
        return v * ratio;
    }
    throw new Error('scale 형식을 알 수 없다: ' + JSON.stringify(spec));
}
function paste(img, cx, cy) {
    const x0 = Math.round(cx - img.w / 2), y0 = Math.round(cy - img.h / 2);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const o = (y * img.w + x) * 4; if (!img.rgba[o + 3]) continue;
        const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= sheet.w || Y >= sheet.h) throw new Error('파츠가 시트 밖으로 나간다. center를 지정한다');
        const i = Y * sheet.w + X; sheet.px[i * 3] = img.rgba[o]; sheet.px[i * 3 + 1] = img.rgba[o + 1]; sheet.px[i * 3 + 2] = img.rgba[o + 2]; sheet.bg[i] = 0;
    }
    let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.rgba[(y * img.w + x) * 4 + 3]) { bx0 = Math.min(bx0, x0 + x); bx1 = Math.max(bx1, x0 + x); by0 = Math.min(by0, y0 + y); by1 = Math.max(by1, y0 + y); }
    return [bx0, by0, bx1 - bx0 + 1, by1 - by0 + 1];
}
/** 맨 끝 순서(읽는 순서상 마지막)가 되고 다른 파츠와 40px 이상 떨어진 빈자리 */
function autoPlace(img) {
    const { labels, parts } = sheetParts(sheet), occupied = new Uint8Array(sheet.w * sheet.h);
    for (let i = 0; i < occupied.length; i++) occupied[i] = sheet.bg[i] ? 0 : 1;
    const fits = (cx, cy) => {
        const x0 = Math.round(cx - img.w / 2) - GAP, y0 = Math.round(cy - img.h / 2) - GAP, x1 = x0 + img.w + 2 * GAP, y1 = y0 + img.h + 2 * GAP;
        if (x0 + GAP < EDGE_MARGIN || y0 + GAP < EDGE_MARGIN || x1 - GAP > sheet.w - EDGE_MARGIN || y1 - GAP > sheet.h - EDGE_MARGIN) return false;
        for (let y = Math.max(0, y0); y < Math.min(sheet.h, y1); y += 2) for (let x = Math.max(0, x0); x < Math.min(sheet.w, x1); x += 2) if (occupied[y * sheet.w + x]) return false;
        const boxes = [...parts.map(c => ({ x: c.x0, y: c.y0, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1 })), { x: cx - img.w / 2, y: cy - img.h / 2, w: img.w, h: img.h }];
        const ord = Fit.readingOrder(boxes); return ord[ord.length - 1] === boxes.length - 1;
    };
    for (let cy = img.h / 2 + EDGE_MARGIN; cy < sheet.h; cy += 8) for (let cx = img.w / 2 + EDGE_MARGIN; cx < sheet.w; cx += 8) if (fits(cx, cy)) return [cx, cy];
    throw new Error('빈자리가 없다. center를 지정하거나 다른 파츠를 옮긴다');
}

try {
    // 번호는 작업 시작 때의 시트 기준으로 고정한다(앞 작업이 번호를 바꾸지 않게)
    const initial = sheetParts(sheet).parts;
    for (const op of job.ops) {
        if (op.remove) { const c = initial[op.remove - 1]; if (!c) throw new Error(`remove: ${op.remove}번 파츠가 없다`); erase(c); log.push({ op: 'remove', part: op.remove }); continue; }
        const srcFile = abs(op.src), src = await readImage(srcFile), magentaSrc = bgColorOf(src)[1] === 0;
        const box = extract(src, op.crop), k = await scaleOf(op.scale, box), rot = op.rotate || 0;
        const img = transform(src, box, k, rot, magentaSrc);
        let center = op.center;
        if (op.replace) {
            const c = initial[op.replace - 1]; if (!c) throw new Error(`replace: ${op.replace}번 파츠가 없다`);
            erase(c); center = center || [(c.x0 + c.x1 + 1) / 2, (c.y0 + c.y1 + 1) / 2];
        }
        if (!center) center = autoPlace(img);
        const placed = paste(img, center[0], center[1]);
        log.push({ op: op.replace ? 'replace' : 'add', part: op.replace || 'last', src: rel(srcFile), srcBox: [box.x0, box.y0, box.x1 - box.x0 + 1, box.y1 - box.y0 + 1], srcBg: magentaSrc ? 'magenta' : 'green', scale: +k.toFixed(4), rotate: rot, sheetBox: placed });
    }
    // 결과 점검: 파츠 사이 간격
    const { labels, parts } = sheetParts(sheet);
    let minGap = Infinity; for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) minGap = Math.min(minGap, componentGap(labels, sheet.w, parts[i], parts[j], 200));
    // 백업과 저장
    if (fs.existsSync(outFile) && !NO_BACKUP) {
        const stem = outFile.replace(/\.png$/i, ''), dir = path.dirname(outFile), base = path.basename(stem);
        const n = Math.max(0, ...fs.readdirSync(dir).map(f => (f.match(new RegExp('^' + base + '_v(\\d+)\\.png$', 'i')) || [])[1] || 0).map(Number)) + 1;
        fs.renameSync(outFile, `${stem}_v${n}.png`); console.log(`기존 시트 백업: ${path.basename(stem)}_v${n}.png`);
    }
    const rgba = new Uint8Array(sheet.w * sheet.h * 4);
    for (let i = 0; i < sheet.w * sheet.h; i++) { rgba.set(sheet.px.subarray(i * 3, i * 3 + 3), i * 4); rgba[i * 4 + 3] = 255; }
    fs.writeFileSync(outFile, encodePNG(sheet.w, sheet.h, rgba));
    const logFile = path.join(path.dirname(outFile), 'compose_log.json');
    const all = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
    all.push({ at: new Date().toISOString(), job: rel(abs(args[0])), out: rel(outFile), bg: BG[1] ? 'green' : 'magenta', ops: log });
    fs.writeFileSync(logFile, JSON.stringify(all, null, 1));
    for (const l of log) console.log(l.op === 'remove' ? `지움 ${l.part}번` : `${l.op === 'replace' ? l.part + '번 바꿈' : '맨 끝 추가'}: 배율 ${l.scale}, 회전 ${l.rotate}도, 시트 상자 [${l.sheetBox.join(', ')}] ← ${l.src}`);
    console.log(`저장: ${rel(outFile)} (파츠 ${parts.length}개, 가장 가까운 간격 ${minGap >= 200 ? '200px 이상' : Math.round(minGap) + 'px'}${minGap < GAP ? ' — 40px 미만, 확인 필요' : ''}). 기록: ${rel(logFile)}`);
    console.log('다음: node test/tools/check_delivery.mjs char <폴더>');
} finally {
    if (edge) { try { edge.close(); } catch { } setTimeout(() => process.exit(0), 500); }
}
