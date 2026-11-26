/*
 * 파츠 시트 분리 + 자동 맞춤 (v0.55.31, 회의 안건 A-21. v0.55.37 머리 소체 시작 위치 보정)
 *
 * 1) 파츠 시트(sheet<번호>_*.png)를 소프트 알파로 투명화(A-24 ②)하고, 연결 덩어리로 파츠를 떼어 낸다.
 *    칸 좌표를 쓰지 않는다. 가까운 조각(기본 15px 이내)은 한 파츠로 묶고, 아주 작은 조각은 가까운 파츠에 붙이거나 버린다.
 * 2) 슬롯 이름: 시트 안 배치 순서(사양 v2 2.2절, 읽는 순서)로 정한다. 개수가 안 맞는 시트만 후보 슬롯과 c00을 거칠게 맞춰 보고
 *    점수 큰 쌍부터 겹치지 않게 고른다. 그다음 뼈대의 예상 위치 주변에서 c00과 맞춰 원래 해상도까지 다듬는다.
 * 3) 결과를 test/build/fit/<캐릭터>/fit_auto.json과 파츠 PNG(src/)로 저장한다. 사람은 test/proto/fit_tool.html에서 확인·조정한다.
 *    같은 폴더에 truth.json(make_fake_v2.mjs)이 있으면 정답과 비교한다.
 *
 * 사용법 (프로젝트 루트):
 *   node test/tools/prepare_fit.mjs <납품 폴더> [--type full|idle] [--skeleton test/rig/skeleton_human.json] [--name 캐릭터] [--merge 15]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, decodePNG, components, componentGap } from './lib.mjs';
import { encodePNG } from '../../scratch/pixelfx/tools/lib/png.mjs';

const require = createRequire(import.meta.url);
const Fit = require('../proto/fit_core.js');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const dir = path.resolve(args[0] || '');
if (!args[0] || !fs.existsSync(path.join(dir, 'c00_complete.png'))) { console.log('사용법: node test/tools/prepare_fit.mjs <c00_complete.png와 sheet*.png가 있는 폴더> [--skeleton 파일] [--name 이름] [--merge px]'); process.exit(2); }
const skelFile = path.resolve(opt('skeleton', path.join(ROOT, 'test', 'rig', 'skeleton_human.json')));
const name = opt('name', path.basename(dir));
const MERGE = +opt('merge', 15), CRUMB = 40, TYPE = opt('type', 'full');
const OUT = path.join(ROOT, 'test', 'build', 'fit', name);
const skel = JSON.parse(fs.readFileSync(skelFile, 'utf8'));
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');

// c00 준비
const c00 = decodePNG(path.join(dir, 'c00_complete.png'));
const ref = { w: c00.w, h: c00.h, rgba: c00.rgba, bg: Fit.bgMask(c00.rgba, c00.w, c00.h) };
const pyr = Fit.pyramid(ref);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'src'), { recursive: true });

// 1) 시트 분리
const sheets = fs.readdirSync(dir).filter(f => /^sheet(\d+)_.*\.png$/i.test(f) && !/_(v\d+|old)\.png$/i.test(f)).sort();
const parts = [];
for (const sf of sheets) {
    const sheetNo = +sf.match(/^sheet(\d+)_/i)[1];
    const img = decodePNG(path.join(dir, sf));
    const keyed = Fit.chromaKey(img.rgba, img.w, img.h).rgba;
    const mask = new Uint8Array(img.w * img.h);
    for (let i = 0; i < mask.length; i++) mask[i] = keyed[i * 4 + 3] > 0 ? 1 : 0;
    const { labels, comps } = components(mask, img.w, img.h);
    // 가까운 덩어리 묶기(합집합 찾기)
    const par = comps.map((_, i) => i), find = i => (par[i] === i ? i : (par[i] = find(par[i])));
    const big = comps.filter(c => c.area >= CRUMB);
    for (let i = 0; i < big.length; i++) for (let j = i + 1; j < big.length; j++) {
        if (componentGap(labels, img.w, big[i], big[j], MERGE + 1) <= MERGE) par[find(big[i].id)] = find(big[j].id);
    }
    // 작은 조각: 30px 안에 큰 덩어리가 있으면 붙이고, 없으면 버린다
    let dropped = 0;
    for (const c of comps.filter(c => c.area < CRUMB)) {
        let near = null, nd = 31;
        for (const b of big) { const d = componentGap(labels, img.w, c, b, 31); if (d < nd) { nd = d; near = b; } }
        if (near) par[c.id] = find(near.id); else { par[c.id] = -1; dropped++; }
    }
    const groups = {};
    comps.forEach(c => { if (par[c.id] === -1) return; const r = find(c.id); (groups[r] = groups[r] || []).push(c); });
    let k = 0;
    for (const g of Object.values(groups)) {
        const ids = new Set(g.map(c => c.id));
        const x0 = Math.max(0, Math.min(...g.map(c => c.x0)) - 1), y0 = Math.max(0, Math.min(...g.map(c => c.y0)) - 1);
        const x1 = Math.min(img.w - 1, Math.max(...g.map(c => c.x1)) + 1), y1 = Math.min(img.h - 1, Math.max(...g.map(c => c.y1)) + 1);
        const w = x1 - x0 + 1, h = y1 - y0 + 1, crop = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const si = (y + y0) * img.w + x + x0;
            // 이 묶음에 속한 픽셀과, 소프트 알파로 살아난 그 주변 1px만 남긴다
            let own = ids.has(labels[si]);
            if (!own && keyed[si * 4 + 3] > 0) for (let dy = -1; dy <= 1 && !own; dy++) for (let dx = -1; dx <= 1 && !own; dx++) { const q = si + dy * img.w + dx; if (q >= 0 && q < labels.length && ids.has(labels[q])) own = true; }
            if (own) crop.set(keyed.subarray(si * 4, si * 4 + 4), (y * w + x) * 4);
        }
        const id = `s${sheetNo}_${++k}`, file = path.join(OUT, 'src', id + '.png');
        fs.writeFileSync(file, encodePNG(w, h, crop));
        parts.push({ id, sheet: sf, sheetNo, src: rel(file), sheetBox: [x0, y0, w, h], pieces: g.length, img: { w, h, rgba: crop } });
    }
    console.log(`${sf}: 덩어리 ${comps.length}개 → 파츠 ${k}개 (묶음 ${MERGE}px, 버린 부스러기 ${dropped}개)`);
}

// 2) 슬롯 고르기: 시트 안 읽는 순서(사양 v2 2.2절). 개수가 안 맞는 시트만 점수로 추정
const t0 = Date.now();
const assigned = {}, usedSlot = new Set(), byScore = [];
for (const sheetNo of [...new Set(parts.map(p => p.sheetNo))]) {
    const ps = parts.filter(p => p.sheetNo === sheetNo);
    const names = Fit.slotsByOrder(TYPE, sheetNo, ps.map(p => ({ x: p.sheetBox[0], y: p.sheetBox[1], w: p.sheetBox[2], h: p.sheetBox[3] })));
    if (names) ps.forEach((p, i) => { assigned[p.id] = names[i]; usedSlot.add(names[i]); p.byOrder = true; });
    else { byScore.push(...ps); console.log(`sheet${sheetNo}: 파츠 수가 순서 규칙과 달라 점수로 추정한다(사람 확인 필요)`); }
}
const candidates = [];
for (const p of byScore) {
    const slots = (((Fit.SHEET_ORDER[TYPE] || {})[p.sheetNo]) || { order: Object.keys(Fit.SLOTS) }).order.filter(s => !usedSlot.has(s));
    for (const slot of slots) {
        const r = Fit.autoFit(ref, p.img, Fit.priorCenter(skel, slot), { win: Fit.SLOTS[slot].win, pyr, coarseOnly: true, rots: [-15, -5, 5, 15], scales: [0.85, 1.0, 1.15] });
        candidates.push({ part: p.id, slot, score: r.score });
    }
}
candidates.sort((a, b) => b.score - a.score);
for (const c of candidates) {
    if (assigned[c.part] || usedSlot.has(c.slot)) continue;
    // 표정 3종은 같은 자리라 c00과 가장 닮은 것을 기본 표정으로 둔다(나머지 구분은 사람이 확인)
    assigned[c.part] = c.slot; usedSlot.add(c.slot);
}

// 3) 다듬기
const fit = { format: 'td-fit/1', name, type: TYPE, source: rel(dir), c00: rel(path.join(dir, 'c00_complete.png')), skeleton: rel(skelFile), generatedAt: new Date().toISOString(), parts: [] };
// 표정 3종은 사양상 같은 자리(5.1절)라 기본 표정만 맞추고 나머지는 그 값을 쓴다. 머리 소체는 기본 표정 근처에서만 찾는다.
const ORDER_FIRST = ['face_neutral', 'head_base'];
const sorted = [...parts].sort((a, b) => {
    const ia = ORDER_FIRST.indexOf(assigned[a.id]), ib = ORDER_FIRST.indexOf(assigned[b.id]);
    return (ia < 0 ? 9 : ia) - (ib < 0 ? 9 : ib);
});
let faceFit = null;
const fitted = {};
for (const p of sorted) {
    const slot = assigned[p.id] || null;
    const S = slot ? Fit.SLOTS[slot] : null;
    let r;
    if (!slot) r = { tx: 512, ty: 512, rot: 0, scale: 1, score: 0 };
    else if (S.face && faceFit && slot !== 'face_neutral') {
        // 다른 표정은 정지 자세에 놓은 기본 표정 패치와 윤곽·피부색을 맞춘다(이목구비가 달라 c00과는 맞지 않는다)
        if (!faceFit.ref) {
            const np = parts.find(q => assigned[q.id] === 'face_neutral'), canvas = new Uint8ClampedArray(ref.w * ref.h * 4);
            Fit.drawAffine(canvas, ref.w, ref.h, np.img.rgba, np.img.w, np.img.h, Fit.partMatrix(faceFit, np.img.w, np.img.h));
            const bg = new Uint8Array(ref.w * ref.h); for (let i = 0; i < bg.length; i++) bg[i] = canvas[i * 4 + 3] < 128 ? 1 : 0;
            faceFit.ref = { w: ref.w, h: ref.h, rgba: canvas, bg }; faceFit.pyr = Fit.pyramid(faceFit.ref);
        }
        r = Fit.autoFit(faceFit.ref, p.img, [faceFit.tx, faceFit.ty], { win: 60, pyr: faceFit.pyr });
        r.viaNeutral = true;
    }
    else if (slot === 'head_base' && faceFit) {
        // 머리 소체는 c00에서 머리카락에 가려져 맞출 그림이 적다. 기본 표정 위치에서 뼈대상 머리-얼굴 거리만큼 옮긴 곳부터 찾는다(R03 4.3 정리안 3)
        const ph = Fit.priorCenter(skel, 'head_base'), pf = Fit.priorCenter(skel, 'face_neutral');
        r = Fit.autoFit(ref, p.img, [faceFit.tx + ph[0] - pf[0], faceFit.ty + ph[1] - pf[1]], { win: 60, pyr, rots: [faceFit.rot - 5, faceFit.rot, faceFit.rot + 5], scales: [faceFit.scale * 0.95, faceFit.scale, faceFit.scale * 1.05] });
    }
    else r = Fit.autoFit(ref, p.img, Fit.priorCenter(skel, slot), { win: S.win, pyr });
    if (slot === 'face_neutral') faceFit = { tx: r.tx, ty: r.ty, rot: r.rot, scale: r.scale, score: r.score };
    fitted[p.id] = r;
}
for (const p of parts) {
    const slot = assigned[p.id] || null;
    const S = slot ? Fit.SLOTS[slot] : null;
    const r = fitted[p.id];
    const flags = [];
    if (r.viaNeutral) flags.push('기본 표정 패치에 맞춤');
    if (!slot) flags.push('슬롯 없음');
    if (r.score < 0.4) flags.push('일치 낮음(가려진 파츠이거나 잘못 배정)');
    if (S && S.face) flags.push('표정 종류 확인');
    if (p.pieces > 1) flags.push(`조각 ${p.pieces}개를 묶음`);
    if (slot && !p.byOrder) flags.push('이름을 점수로 추정');
    fit.parts.push({ id: p.id, src: p.src, sheet: p.sheet, sheetBox: p.sheetBox, w: p.img.w, h: p.img.h, slot, bone: S ? S.bone : null, z: S ? S.z : 0,
        face: S && S.face ? S.face : undefined, tx: +r.tx.toFixed(1), ty: +r.ty.toFixed(1), rot: r.rot, scale: r.scale, score: r.score, flags });
}
fs.writeFileSync(path.join(OUT, 'fit_auto.json'), JSON.stringify(fit, null, 1));
console.log(`자동 맞춤 ${parts.length}개, ${((Date.now() - t0) / 1000).toFixed(1)}초 → ${rel(path.join(OUT, 'fit_auto.json'))}`);

// 정답 비교(가짜 납품)
const truthFile = path.join(dir, 'truth.json');
if (fs.existsSync(truthFile)) {
    const truth = JSON.parse(fs.readFileSync(truthFile, 'utf8')).truth;
    let ok = 0, rows = [];
    const truthFit = { ...fit, note: '가짜 납품 정답으로 만든 배치(export 흐름 시험용)', parts: [] };
    for (const fp of fit.parts) {
        // 시트 위 중심이 가장 가까운 정답 슬롯
        const cx = fp.sheetBox[0] + fp.sheetBox[2] / 2, cy = fp.sheetBox[1] + fp.sheetBox[3] / 2;
        let best = null, bd = 1e9;
        for (const [slot, t] of Object.entries(truth)) { if (t.sheet + '.png' !== fp.sheet) continue; const d = Math.hypot(t.sheetCenter[0] - cx, t.sheetCenter[1] - cy); if (d < bd) { bd = d; best = slot; } }
        const t = truth[best];
        // 떼어 낸 그림의 중심과 시트 원래 중심이 조금 다를 수 있어, 정지 자세 중심 오차를 그 차이만큼 보정해 비교
        // 위치 오차: 떼어 낸 그림의 네 모서리와 가운데가 정지 자세에서 놓이는 자리를 정답과 비교한 평균 거리
        const Mf = Fit.partMatrix(fp, fp.w, fp.h);
        const tr = t.rot * Math.PI / 180, tc = Math.cos(tr) * t.scale, ts = Math.sin(tr) * t.scale;
        let pos = 0;
        for (const [lx, ly] of [[0, 0], [fp.w, 0], [0, fp.h], [fp.w, fp.h], [fp.w / 2, fp.h / 2]]) {
            const ax = Mf[0] * lx + Mf[2] * ly + Mf[4], ay = Mf[1] * lx + Mf[3] * ly + Mf[5];
            const sx = fp.sheetBox[0] + lx - t.sheetCenter[0], sy = fp.sheetBox[1] + ly - t.sheetCenter[1];
            const bx = t.tx + tc * sx - ts * sy, by = t.ty + ts * sx + tc * sy;
            pos += Math.hypot(ax - bx, ay - by) / 5;
        }
        // 정답 배치: 떼어 낸 그림 가운데가 정지 자세에서 놓일 자리
        {
            const sx = fp.sheetBox[0] + fp.w / 2 - t.sheetCenter[0], sy = fp.sheetBox[1] + fp.h / 2 - t.sheetCenter[1];
            truthFit.parts.push({ ...fp, slot: best, bone: Fit.SLOTS[best].bone, z: Fit.SLOTS[best].z, face: Fit.SLOTS[best].face,
                tx: +(t.tx + tc * sx - ts * sy).toFixed(2), ty: +(t.ty + ts * sx + tc * sy).toFixed(2), rot: t.rot, scale: t.scale, score: 1, flags: ['정답'] });
        }
        const rot = Math.abs(fp.rot - t.rot), sc = Math.abs(fp.scale - t.scale);
        const right = fp.slot === best || (Fit.SLOTS[fp.slot] && Fit.SLOTS[fp.slot].face && Fit.SLOTS[best].face);
        if (right && pos <= 6 && rot <= 2 && sc <= 0.03) ok++;
        rows.push(`${fp.id.padEnd(6)} 정답 ${best.padEnd(15)} 배정 ${String(fp.slot).padEnd(15)} 위치오차 ${pos.toFixed(1).padStart(5)}px 회전오차 ${rot.toFixed(1).padStart(4)}도 크기오차 ${sc.toFixed(3)} 점수 ${fp.score}`);
    }
    console.log(rows.join('\n'));
    fs.writeFileSync(path.join(OUT, 'fit_truth.json'), JSON.stringify(truthFit, null, 1));
    console.log(`정답 비교: ${ok}/${fit.parts.length}개가 슬롯 일치 + 위치 6px·회전 2도·크기 0.03 이내 (표정 3종끼리 바뀐 것은 일치로 셈)`);
}
