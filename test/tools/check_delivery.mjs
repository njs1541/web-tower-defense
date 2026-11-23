/*
 * 납품 자동 검사 (v0.55.23, 회의 안건 A-07)
 * test/ASSET_SPEC.md의 수치 규격을 기계적으로 확인한다. 이미지 내용(부위가 맞는지, 표현이 적절한지)은 사람이 본다.
 *
 * 사용법 (프로젝트 루트):
 *   node test/tools/check_delivery.mjs body test/incoming/body_human
 *   node test/tools/check_delivery.mjs char test/incoming/char_liana [full|idle]
 * 결과: 콘솔 표 + test/build/check/<폴더 이름>.json. 실패 항목이 있으면 종료 코드 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, decodePNG, isBackground, CHROMA_RULE } from './lib.mjs';

const [kind, dirArg, typeArg = 'full'] = process.argv.slice(2);
if (!['body', 'char'].includes(kind) || !dirArg) {
    console.log('사용법: node test/tools/check_delivery.mjs body <폴더> | char <폴더> [full|idle]');
    process.exit(2);
}
const dir = path.resolve(dirArg);

// ASSET_SPEC.md 4절, 5절, 5.1절
const BODY_FILES = ['b00_master', 'b01_head_base', 'b02_torso_upper', 'b03_pelvis', 'b04_arm_near_upper', 'b05_arm_near_lower', 'b06_arm_far_upper', 'b07_arm_far_lower', 'b08_leg_near', 'b09_leg_far'];
const CHAR_FULL = ['c00_complete', 'c01_hair_back', 'c02_hair_front', 'c03_face_neutral', 'c04_face_blink', 'c05_face_attack', 'c06_top', 'c07_skirt_front', 'c08_skirt_back', 'c09_sleeve_near', 'c10_sleeve_far', 'c11_pants_near', 'c12_pants_far', 'c13_weapon_main', 'c14_weapon_sub'];
const CHAR_IDLE = ['c00_complete', 'c01_hair_back', 'c02_hair_front', 'c03_face_neutral', 'c04_face_blink', 'c06_top', 'c09_sleeve_near', 'c10_sleeve_far', 'c13_weapon_main', 'c14_weapon_sub', 'c15_lower'];
const B00 = { top: [170, 190], foot: [870, 890], head: [260, 300], height: [680, 720] };
const ALIGN_TOL = 5;
const SIZE = 1024;

const results = [];
const add = (file, item, ok, detail, level = ok ? '통과' : '실패') => results.push({ file, item, level, detail });

function mask(img) {
    const m = new Uint8Array(img.w * img.h), p = img.rgba;
    for (let i = 0; i < img.w * img.h; i++) m[i] = isBackground(p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3]) ? 0 : 1;
    return m;
}
function dilate(m, w, h, r) {
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { let run = -1e9; for (let x = 0; x < w; x++) { if (m[y * w + x]) run = x; if (x - run <= r) t[y * w + x] = 1; } run = 1e9; for (let x = w - 1; x >= 0; x--) { if (m[y * w + x]) run = x; if (run - x <= r) t[y * w + x] = 1; } }
    for (let x = 0; x < w; x++) { let run = -1e9; for (let y = 0; y < h; y++) { if (t[y * w + x]) run = y; if (y - run <= r) o[y * w + x] = 1; } run = 1e9; for (let y = h - 1; y >= 0; y--) { if (t[y * w + x]) run = y; if (run - y <= r) o[y * w + x] = 1; } }
    return o;
}
/** a의 픽셀 중 b(허용 r px)에서 벗어난 비율 */
function outsidePct(a, b, w, h, r) {
    const db = dilate(b, w, h, r); let n = 0, out = 0;
    for (let i = 0; i < w * h; i++) if (a[i]) { n++; if (!db[i]) out++; }
    return n ? 100 * out / n : 0;
}

const expected = kind === 'body' ? BODY_FILES : (typeArg === 'idle' ? CHAR_IDLE : CHAR_FULL);
const imgs = {};
for (const name of expected) {
    const f = path.join(dir, name + '.png');
    if (!fs.existsSync(f)) {
        const alt = fs.readdirSync(dir).find(x => x.startsWith(name + '.'));
        add(name, '파일', false, alt ? `PNG가 아님: ${alt}` : '없음');
        continue;
    }
    let img;
    try { img = decodePNG(f); } catch (e) { add(name, '파일', false, e.message); continue; }
    imgs[name] = img;
    add(name, '캔버스 1024x1024', img.w === SIZE && img.h === SIZE, `${img.w}x${img.h}`);
    add(name, '색 형식', true, img.hasAlpha ? 'RGBA' : 'RGB(알파 없음)', '정보');

    // 배경: 가장자리 4px이 모두 배경이어야 하고, 크로마키 배경색은 고르게 단색이어야 한다
    const p = img.rgba; let edgeFg = 0, bgN = 0, sum = [0, 0, 0], sq = [0, 0, 0], greenish = 0;
    const m = mask(img);
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
        const i = y * img.w + x;
        if ((x < 4 || y < 4 || x >= img.w - 4 || y >= img.h - 4) && m[i]) edgeFg++;
        if (!m[i] && p[i * 4 + 3] >= 20) { bgN++; for (let k = 0; k < 3; k++) { sum[k] += p[i * 4 + k]; sq[k] += p[i * 4 + k] ** 2; } }
        if (m[i] && x > 0 && y > 0 && x < img.w - 1 && y < img.h - 1 && (!m[i - 1] || !m[i + 1] || !m[i - img.w] || !m[i + img.w])) {
            const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2];
            if (g > r + 25 && g > b + 25) greenish++;
        }
    }
    add(name, '가장자리 비움', edgeFg === 0, edgeFg ? `가장자리 4px에 내용 ${edgeFg}px (잘림 의심)` : '정상');
    if (bgN) {
        const std = Math.max(...[0, 1, 2].map(k => Math.sqrt(Math.max(0, sq[k] / bgN - (sum[k] / bgN) ** 2))));
        const mean = sum.map(v => Math.round(v / bgN));
        add(name, '배경 단색', std <= 12, `평균 rgb(${mean.join(',')}), 편차 ${std.toFixed(1)}${std > 12 ? ' (그라데이션이나 그림자 의심)' : ''}`);
    }
    add(name, '외곽 녹색 번짐', greenish < 300, `외곽 픽셀 중 녹색 기운 ${greenish}개 (빌드 전처리로 보정 가능)`, greenish < 300 ? '통과' : '경고');
}

// b00 수치 (4절)
if (kind === 'body' && imgs.b00_master) {
    const img = imgs.b00_master, m = mask(img), w = img.w;
    const rows = []; for (let y = 0; y < img.h; y++) { let c = 0; for (let x = 0; x < w; x++) c += m[y * w + x]; rows.push(c); }
    const top = rows.findIndex(c => c > 0), foot = img.h - 1 - [...rows].reverse().findIndex(c => c > 0);
    let neck = -1, minW = 1e9;
    for (let y = top + 150; y < Math.min(top + 420, foot); y++) if (rows[y] > 0 && rows[y] < minW) { minW = rows[y]; neck = y; }
    const head = neck - top, height = foot - top + 1;
    const inR = (v, [a, b]) => v >= a && v <= b;
    add('b00_master', '머리 꼭대기 y', inR(top, B00.top), `${top} (사양 ${B00.top.join('-')})`);
    add('b00_master', '발바닥 y', inR(foot, B00.foot), `${foot} (사양 ${B00.foot.join('-')})`);
    add('b00_master', '머리 높이', inR(head, B00.head), `${head}px, 목 y=${neck} (사양 ${B00.head.join('-')})`);
    add('b00_master', '전체 키', inR(height, B00.height), `${height}px, ${(height / head).toFixed(2)}등신 (사양 ${B00.height.join('-')}, 2.5등신)`);
    // 바디슈트: 몸통 가운데 영역의 색이 회색(채도 낮음)인지
    let n = 0, sat = 0, skin = 0, rs = 0, gs = 0, bs = 0;
    for (let y = neck + 60; y < neck + 200 && y < foot; y++) {
        const xs = []; for (let x = 0; x < w; x++) if (m[y * w + x]) xs.push(x);
        if (!xs.length) continue;
        const mid = Math.round((xs[0] + xs[xs.length - 1]) / 2), half = Math.max(4, Math.round((xs[xs.length - 1] - xs[0]) * 0.15));
        for (let x = mid - half; x <= mid + half; x++) {
            if (!m[y * w + x]) continue;
            const i = (y * w + x) * 4, r = img.rgba[i], g = img.rgba[i + 1], b = img.rgba[i + 2];
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            n++; sat += mx ? (mx - mn) / mx : 0; rs += r; gs += g; bs += b;
            if (r > g && g > b && r - b > 35) skin++;
        }
    }
    if (n) {
        const avgSat = sat / n, skinPct = 100 * skin / n;
        add('b00_master', '바디슈트(몸통 색)', avgSat < 0.18 && skinPct < 20,
            `몸통 평균 rgb(${Math.round(rs / n)},${Math.round(gs / n)},${Math.round(bs / n)}), 채도 ${avgSat.toFixed(2)}, 피부색 비율 ${skinPct.toFixed(0)}% (사양: 중간 회색 #8A8F98, 피부색 금지)`);
    }
    add('b00_master', '사람 확인 필요', true, '가슴·골반 윤곽 없음, 발가락 없음, 회색 신발, 민머리. 자동 판정하지 않는다', '정보');
}

// 조립 정합 (8절: 겹치면 기준 이미지와 5px 이내)
const refName = kind === 'body' ? 'b00_master' : 'c00_complete';
if (imgs[refName]) {
    const ref = mask(imgs[refName]), union = new Uint8Array(SIZE * SIZE);
    for (const [name, img] of Object.entries(imgs)) {
        if (name === refName || img.w !== SIZE || img.h !== SIZE) continue;
        const m = mask(img);
        for (let i = 0; i < m.length; i++) if (m[i]) union[i] = 1;
        const out = outsidePct(m, ref, SIZE, SIZE, ALIGN_TOL);
        add(name, `기준(${refName}) 안에 있음`, out < 2, `기준에서 ${ALIGN_TOL}px 넘게 벗어난 픽셀 ${out.toFixed(2)}%`);
    }
    const missing = outsidePct(ref, union, SIZE, SIZE, ALIGN_TOL);
    add('(조립)', '기준을 파츠가 덮음', missing < 2, `기준 그림 중 어느 파츠에도 없는 부분 ${missing.toFixed(2)}%${kind === 'char' ? ' (칼집처럼 사양에서 뺀 부위가 있으면 그만큼 남는다)' : ''}`, missing < 2 ? '통과' : '경고');
}

// 자동으로 못 잡는 것
add('(전체)', '사람 확인 필요', true, '다른 부위가 섞였는지(예: 바지 파츠에 손·칼자루). test/proto/rig_dom.html에서 모션을 돌려 원래 자리에 남는 조각이 없는지 본다', '정보');

// 출력
const fails = results.filter(r => r.level === '실패');
const warns = results.filter(r => r.level === '경고');
for (const r of results) if (r.level !== '통과' || process.env.VERBOSE) console.log(`[${r.level}] ${r.file.padEnd(20)} ${r.item}: ${r.detail}`);
console.log(`\n검사 ${results.length}항목: 실패 ${fails.length}, 경고 ${warns.length}. 배경 판정: 녹색 ${CHROMA_RULE.green} / 마젠타 ${CHROMA_RULE.magenta} / 투명 ${CHROMA_RULE.transparent}`);
const outDir = path.join(ROOT, 'test', 'build', 'check');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, path.basename(dir) + '.json'), JSON.stringify({ checkedAt: new Date().toISOString(), kind, type: typeArg, results }, null, 1));
process.exit(fails.length ? 1 : 0);
