/*
 * 시험용 가짜 v2 납품 만들기 (v0.55.31, 회의 안건 A-21 시험)
 *
 * 새 방식(따로 그린 파츠 시트) 도구를 정식 납품 전에 시험하기 위해, 지금 리아나 파츠(v1, export_rig.mjs 결과)를
 * 사양 v2 슬롯(몸·옷 일체형)으로 합친 뒤, 무작위로 돌리고 크기를 바꿔 파츠 시트 4장에 흩어 놓는다.
 * 원래 자리(정답)를 truth.json에 남겨 자동 맞춤의 정확도를 잴 수 있다.
 * 진짜 납품이 아니므로 그림 품질(잘라내기 결함)은 v1 그대로다.
 *
 * 사용법 (프로젝트 루트): node test/tools/export_rig.mjs 후 node test/tools/make_fake_v2.mjs
 * 출력: test/build/fake_v2/ (c00_complete.png, sheet1_head.png ~ sheet4_legs_weapons.png, truth.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { ROOT, decodePNG } from './lib.mjs';
import { encodePNG } from '../../scratch/pixelfx/tools/lib/png.mjs';

const require = createRequire(import.meta.url);
const Fit = require('../proto/fit_core.js');
const OUT = path.join(ROOT, 'test', 'build', 'fake_v2');
const B = path.join(ROOT, 'test', 'build');

// v2 슬롯 = v1 파츠 조합(아래 → 위)
const COMPOSE = {
    // 시트 안 순서는 사양 v2 2.2절(5절 표 순서, 읽는 순서)
    sheet1_head: { head_base: ['b01'], hair_front: ['c02'], hair_back: ['c01'], face_neutral: ['b01', 'c03'], face_blink: ['b01', 'c04'], face_attack: ['b01', 'c05'] },
    sheet2_body: { torso: ['b02', 'c06'], pelvis: ['b03', 'c07'], skirt_back: ['c08'] },
    sheet3_arms: { arm_near_upper: ['b04', 'c09'], arm_near_lower: ['b05'], arm_far_upper: ['b06', 'c10'], arm_far_lower: ['b07'] },
    sheet4_legs_weapons: { leg_near: ['b08', 'c11'], leg_far: ['b09', 'c12'], weapon_main: ['c13'], weapon_sub: ['c14'] },
};

// 결정적 난수(매번 같은 시트)
let seed = 20261124;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const layers = {};
for (const [rigFile, dir] of [['body_human/body.json', 'body_human'], ['liana/rig.json', 'liana']]) {
    for (const l of JSON.parse(fs.readFileSync(path.join(B, rigFile), 'utf8')).layers) layers[l.id] = { ...l, img: decodePNG(path.join(B, dir, 'parts', l.id + '.png')) };
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'test', 'incoming', 'char_liana', 'c00_complete.png'), path.join(OUT, 'c00_complete.png'));

const truth = {};
for (const [sheet, slots] of Object.entries(COMPOSE)) {
    // 1) 슬롯 그림: 정지 자세 1024 캔버스에 v1 파츠를 겹친 뒤 내용 영역만 잘라 낸다
    const items = [];
    for (const [slot, ids] of Object.entries(slots)) {
        const canvas = new Uint8ClampedArray(1024 * 1024 * 4);
        for (const id of ids) { const l = layers[id]; Fit.drawAffine(canvas, 1024, 1024, l.img.rgba, l.img.w, l.img.h, [1, 0, 0, 1, l.x, l.y]); }
        // 표정은 얼굴 패치(A-23): 앞머리 아래 얼굴 부분만(눈썹 위 15px부터) 남긴다
        if (slot.startsWith('face_')) { const top = layers.c03.y - 15; canvas.fill(0, 0, top * 1024 * 4); }
        let x0 = 1024, y0 = 1024, x1 = -1, y1 = -1;
        for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) if (canvas[(y * 1024 + x) * 4 + 3] > 0) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        const w = x1 - x0 + 1, h = y1 - y0 + 1, crop = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) crop.set(canvas.subarray(((y + y0) * 1024 + x0) * 4, ((y + y0) * 1024 + x1 + 1) * 4), y * w * 4);
        // "따로 그린" 효과: -12-12도 회전, 0.85-1.2배
        const rot = Math.round((rnd() * 24 - 12) * 10) / 10, scale = Math.round((0.85 + rnd() * 0.35) * 100) / 100;
        items.push({ slot, w, h, crop, rot, scale, restCx: x0 + w / 2, restCy: y0 + h / 2 });
    }
    // 2) 시트 배치: 돌린 뒤 크기로 선반 배치, 간격 90px
    const GAP = 90, MAXW = 1500;
    let x = GAP, y = GAP, rowH = 0, W = 0;
    for (const it of items) {
        const r = it.rot * Math.PI / 180, bw = (Math.abs(Math.cos(r)) * it.w + Math.abs(Math.sin(r)) * it.h) * it.scale, bh = (Math.abs(Math.sin(r)) * it.w + Math.abs(Math.cos(r)) * it.h) * it.scale;
        if (x + bw + GAP > MAXW) { x = GAP; y += rowH + GAP; rowH = 0; }
        it.sx = x + bw / 2; it.sy = y + bh / 2; x += bw + GAP; rowH = Math.max(rowH, bh); W = Math.max(W, x);
    }
    const SW = Math.ceil(W), SH = Math.ceil(y + rowH + GAP);
    const sheetPx = new Uint8ClampedArray(SW * SH * 4);
    for (let i = 0; i < SW * SH; i++) { sheetPx[i * 4 + 1] = 255; sheetPx[i * 4 + 3] = 255; } // #00FF00
    for (const it of items) {
        Fit.drawAffine(sheetPx, SW, SH, it.crop, it.w, it.h, Fit.partMatrix({ tx: it.sx, ty: it.sy, rot: it.rot, scale: it.scale }, it.w, it.h));
        // 정답: 시트 그림을 다시 정지 자세로 돌리는 변환(시트에서 떼어 낸 파츠 기준)
        truth[it.slot] = { sheet, sheetCenter: [+it.sx.toFixed(1), +it.sy.toFixed(1)], tx: it.restCx, ty: it.restCy, rot: -it.rot, scale: +(1 / it.scale).toFixed(4) };
    }
    fs.writeFileSync(path.join(OUT, sheet + '.png'), encodePNG(SW, SH, sheetPx));
    console.log(`${sheet}: ${SW}x${SH}, 파츠 ${items.length}개`);
}
fs.writeFileSync(path.join(OUT, 'truth.json'), JSON.stringify({ note: '가짜 v2 납품의 정답. tx, ty는 정지 자세에서 파츠 중심, rot·scale은 시트 그림을 정지 자세로 돌리는 값', truth }, null, 1));
