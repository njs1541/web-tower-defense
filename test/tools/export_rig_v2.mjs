/*
 * 리그 내보내기 v2 (v0.55.31, 회의 안건 A-06 변경, A-21, A-24 ①)
 *
 * 자리 맞춤 결과(fit.json, td-fit/1)를 게임용 리그(td-rig-char/2)로 만든다.
 *   1) 파츠마다 맞춘 위치·회전·크기로 정지 자세 캔버스에 한 번 그린 뒤(미리 굽기) 내용 영역만 잘라 낸다.
 *      런타임은 회전·크기 없이 위치만 읽으면 되므로 rig_runtime.js의 계산을 바꾸지 않는다.
 *      회전이 15도를 넘으면 재샘플링 손실이 커지니 경고한다.
 *   2) 아틀라스 1장(PNG, WebP 품질 0.9)으로 묶는다. WebP 인코딩만 헤드리스 Edge를 쓴다.
 *   3) rig.json: 뼈대 파일 경로(skeleton), 레이어(id = 슬롯 이름, bone, z, x, y, w, h, 아틀라스 좌표), 표정 대응표
 *
 * 사용법 (프로젝트 루트): node test/tools/export_rig_v2.mjs <fit.json> [--out 이름]
 * 출력: test/build/rig_v2/<이름>/ (rig.json, atlas.png, atlas.webp, parts/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, decodePNG, ensureServer, launchEdge, saveDataUrl } from './lib.mjs';
import { encodePNG } from '../../scratch/pixelfx/tools/lib/png.mjs';
import { checkSeams } from './seam_check.mjs';

const require = createRequire(import.meta.url);
const Fit = require('../proto/fit_core.js');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!args[0]) { console.log('사용법: node test/tools/export_rig_v2.mjs <fit.json> [--out 이름]'); process.exit(2); }
const fitFile = path.resolve(args[0]);
const fit = JSON.parse(fs.readFileSync(fitFile, 'utf8'));
const name = opt('out', fit.name);
const OUT = path.join(ROOT, 'test', 'build', 'rig_v2', name);
const PAD = 256, CW = 1024 + PAD * 2, ROT_WARN = 15;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'parts'), { recursive: true });

const layers = [], warnings = [];
for (const p of fit.parts) {
    if (!p.slot) { warnings.push(`${p.id}: 슬롯이 없어 뺐다`); continue; }
    if (layers.some(l => l.id === p.slot)) { warnings.push(`${p.id}: 슬롯 ${p.slot}이 겹쳐 뺐다`); continue; }
    if (Math.abs(p.rot) > ROT_WARN) warnings.push(`${p.slot}: 회전 ${p.rot}도(${ROT_WARN}도 초과). 미리 굽기 재샘플링으로 선이 흐려질 수 있다. 원래 자세에 가깝게 다시 그리기를 권장`);
    const src = decodePNG(path.join(ROOT, p.src));
    const canvas = new Uint8ClampedArray(CW * CW * 4);
    Fit.drawAffine(canvas, CW, CW, src.rgba, src.w, src.h, Fit.partMatrix(p, src.w, src.h), PAD, PAD);
    let x0 = CW, y0 = CW, x1 = -1, y1 = -1;
    for (let y = 0; y < CW; y++) for (let x = 0; x < CW; x++) if (canvas[(y * CW + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { warnings.push(`${p.slot}: 그릴 내용이 없다`); continue; }
    if (x0 === 0 || y0 === 0 || x1 === CW - 1 || y1 === CW - 1) warnings.push(`${p.slot}: 굽기 여백(${PAD}px) 끝에 닿았다. 위치를 확인`);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, crop = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) crop.set(canvas.subarray(((y + y0) * CW + x0) * 4, ((y + y0) * CW + x1 + 1) * 4), y * w * 4);
    const S = Fit.SLOTS[p.slot] || {};
    layers.push({ id: p.slot, kind: S.face ? 'face' : 'part', bone: p.bone || S.bone, z: p.z ?? S.z, x: x0 - PAD, y: y0 - PAD, w, h, crop, from: p.id });
}

// 대기형(R04 A-48, v0.55.68): 팔을 한 덩어리(어깨 뼈)로 그리므로 팔꿈치·손목 뼈에는 그림이 없다. 그런 뼈에 붙은 파츠(주무기,
// 보조무기)가 그대로 있으면 팔꿈치 회전만큼 팔 그림과 어긋난다(대기 모션 최대 20.8px). 그림이 있는 가장 가까운 조상 뼈로 옮긴다.
// 전체형은 손목 회전(공격)이 의도된 움직임이라 건드리지 않는다.
if ((fit.type || 'full') === 'idle') {
    const skel = JSON.parse(fs.readFileSync(path.join(ROOT, fit.skeleton), 'utf8'));
    const parentOf = Object.fromEntries(skel.bones.map(b => [b.id, b.parent]));
    // 몸 그림이 있는 뼈: 표정과 들고 있는 물건(무기, 추가 파츠)은 빼고 센다. 무기 자신의 뼈를 세면 옮길 곳이 없다고 잘못 판정한다
    const carried = id => /^(weapon_|extra_)/.test(id);
    const drawn = new Set(layers.filter(l => l.kind !== 'face' && !carried(l.id)).map(l => l.bone));
    for (const l of layers) {
        if (!carried(l.id)) continue;
        let b = l.bone;
        while (b && !drawn.has(b) && parentOf[b]) b = parentOf[b];
        if (b && b !== l.bone && drawn.has(b)) { warnings.push(`${l.id}: 대기형이라 뼈를 ${l.bone} → ${b}로 옮겼다(그림 없는 관절, A-48)`); l.bone = b; }
    }
}

// 이음새 검사(R04 A-38, v0.55.70): 같은 재질 경계의 진한 선, 둥근 끝 중심과 관절 축 거리. 결과는 checks.json
const skelAll = JSON.parse(fs.readFileSync(path.join(ROOT, fit.skeleton), 'utf8'));
const pivotOf = b => (fit.pivots && fit.pivots[b]) || (skelAll.bones.find(x => x.id === b) || {}).pivot || [512, 512];
const seams = checkSeams(layers, pivotOf);
for (const r of seams) for (const w of r.warnings) warnings.push('[이음새] ' + w);

// 아틀라스(높이순 선반 배치, 간격 2px)
const MAXW = 2048, GAP = 2;
let ax = 0, ay = 0, rowH = 0, AW = 0;
for (const l of [...layers].sort((a, b) => b.h - a.h)) {
    if (ax + l.w > MAXW) { ax = 0; ay += rowH + GAP; rowH = 0; }
    l.ax = ax; l.ay = ay; ax += l.w + GAP; rowH = Math.max(rowH, l.h); AW = Math.max(AW, ax);
}
const AH = ay + rowH, atlas = new Uint8ClampedArray(AW * AH * 4);
for (const l of layers) {
    for (let y = 0; y < l.h; y++) atlas.set(l.crop.subarray(y * l.w * 4, (y + 1) * l.w * 4), ((l.ay + y) * AW + l.ax) * 4);
    fs.writeFileSync(path.join(OUT, 'parts', l.id + '.png'), encodePNG(l.w, l.h, l.crop));
}
const pngBuf = encodePNG(AW, AH, atlas);
fs.writeFileSync(path.join(OUT, 'atlas.png'), pngBuf);

// WebP 인코딩(헤드리스 Edge)
const server = await ensureServer();
const { cdp, close } = await launchEdge();
let webpBytes = 0;
try {
    await cdp.navigate('http://localhost:8085/test/proto/rig_dom.html?bake');
    const relAtlas = '/' + path.relative(ROOT, path.join(OUT, 'atlas.png')).replace(/\\/g, '/');
    const url = await cdp.evaluate(`new Promise(res => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); res(c.toDataURL('image/webp', 0.9)); }; i.src = ${JSON.stringify(relAtlas)} + '?t=' + Date.now(); })`);
    webpBytes = saveDataUrl(url, path.join(OUT, 'atlas.webp'));
} finally { close(); if (server) server.kill(); }

const skelRel = path.relative(OUT, path.join(ROOT, fit.skeleton)).replace(/\\/g, '/');
const faces = {};
for (const l of layers) if (l.kind === 'face') faces[Fit.SLOTS[l.id].face] = l.id;
const rig = {
    format: 'td-rig-char/2', id: name, type: fit.type || 'full', skeleton: skelRel, canvas: 1024,
    ...(fit.pivots ? { pivots: fit.pivots } : {}), // 캐릭터별 관절 축 보정(v0.55.53)
    note: '파츠는 정지 자세 좌표로 미리 구웠다(R02 A-24 ①). x, y는 1024 캔버스 기준(음수 가능).',
    atlas: { png: 'atlas.png', webp: 'atlas.webp', w: AW, h: AH }, faces,
    layers: layers.sort((a, b) => a.z - b.z).map(({ crop, from, ...l }) => l),
};
fs.writeFileSync(path.join(OUT, 'rig.json'), JSON.stringify(rig, null, 1));
fs.writeFileSync(path.join(OUT, 'checks.json'), JSON.stringify({ checkedAt: new Date().toISOString(), seams, warnings }, null, 1));
console.log(`레이어 ${layers.length}개, 아틀라스 ${AW}x${AH} PNG ${(pngBuf.length / 1024).toFixed(0)}KB / WebP ${(webpBytes / 1024).toFixed(0)}KB → ${path.relative(ROOT, OUT)}`);
for (const w of warnings) console.log('[경고] ' + w);
