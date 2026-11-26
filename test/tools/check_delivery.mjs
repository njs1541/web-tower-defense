/*
 * 납품 자동 검사 (v0.55.23 작성, v0.55.29 사양 v2 대응, v0.55.35 대기형 시트·턱 기준 머리 높이. 회의 안건 A-07, R02 A-07 변경, R03 A-32)
 * test/ASSET_SPEC.md의 수치 규격을 기계적으로 확인한다. 이미지 내용(부위가 맞는지, 표현이 적절한지)은 사람이 본다.
 *
 * 사용법 (프로젝트 루트):
 *   node test/tools/check_delivery.mjs body <폴더>              사양 v2: b00 마네킹만 검사
 *   node test/tools/check_delivery.mjs char <폴더> [full|idle]  사양 v2: c00 + 파츠 시트(sheet<번호>_*.png)
 *   node test/tools/check_delivery.mjs body-v1 <폴더>           사양 v1(잘라내기): b00 + b01-b09, 같은 자리 정합
 *   node test/tools/check_delivery.mjs char-v1 <폴더> [full|idle]
 * 결과: 콘솔 표 + test/build/check/<폴더 이름>.json. 실패 항목이 있으면 종료 코드 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, decodePNG, isBackground, CHROMA_RULE, components, componentGap } from './lib.mjs';

const [kind, dirArg, typeArg = 'full'] = process.argv.slice(2);
if (!['body', 'char', 'body-v1', 'char-v1'].includes(kind) || !dirArg) {
    console.log('사용법: node test/tools/check_delivery.mjs body|char|body-v1|char-v1 <폴더> [full|idle]');
    process.exit(2);
}
const dir = path.resolve(dirArg);
const V1 = kind.endsWith('-v1'), IS_BODY = kind.startsWith('body');

// ASSET_SPEC.md 4절, 5절, 5.1절
const BODY_FILES = ['b00_master', 'b01_head_base', 'b02_torso_upper', 'b03_pelvis', 'b04_arm_near_upper', 'b05_arm_near_lower', 'b06_arm_far_upper', 'b07_arm_far_lower', 'b08_leg_near', 'b09_leg_far'];
const CHAR_FULL = ['c00_complete', 'c01_hair_back', 'c02_hair_front', 'c03_face_neutral', 'c04_face_blink', 'c05_face_attack', 'c06_top', 'c07_skirt_front', 'c08_skirt_back', 'c09_sleeve_near', 'c10_sleeve_far', 'c11_pants_near', 'c12_pants_far', 'c13_weapon_main', 'c14_weapon_sub'];
const CHAR_IDLE = ['c00_complete', 'c01_hair_back', 'c02_hair_front', 'c03_face_neutral', 'c04_face_blink', 'c06_top', 'c09_sleeve_near', 'c10_sleeve_far', 'c13_weapon_main', 'c14_weapon_sub', 'c15_lower'];
const B00 = { top: [170, 190], foot: [870, 890], head: [260, 300], height: [680, 720] };
const ALIGN_TOL = 5;
// 사양 v2 파츠 시트(5절): 시트 이름 → 기대 파츠 수 [최소, 최대]
const SHEETS_FULL = { sheet1_head: [6, 6], sheet2_body: [2, 3], sheet3_arms: [4, 4], sheet4_legs_weapons: [3, 5] }; // 시트 4: 가까운 손(선택, v0.55.54) 포함 최대 5
const SHEETS_IDLE = { sheet1_head: [5, 5], sheet2_body_arms: [4, 5], sheet3_weapons: [1, 2] }; // 5.2절 (R03 A-32, 뒷자락 선택 A-27 G2)
const SHEETS = typeArg === 'idle' ? SHEETS_IDLE : SHEETS_FULL;
const PART_MIN_AREA = 150; // 이보다 작은 덩어리는 부스러기로 본다
const PART_GAP = 40;       // 파츠 사이 최소 간격(2.2절)
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

let expected;
if (V1) expected = IS_BODY ? BODY_FILES : (typeArg === 'idle' ? CHAR_IDLE : CHAR_FULL);
else if (IS_BODY) expected = ['b00_master'];
else {
    const sheets = fs.readdirSync(dir).filter(x => /^sheet\d+_.*\.png$/i.test(x) && !/_(v\d+|old)\.png$/i.test(x)).map(x => x.replace(/\.png$/i, '')).sort();
    expected = ['c00_complete', ...new Set([...Object.keys(SHEETS), ...sheets])];
    for (const x of sheets) if (!SHEETS[x]) add(x, '시트 이름', false, `사양 5절(${typeArg === 'idle' ? '대기형' : '전체형'})에 없는 시트 이름. 기대: ${Object.keys(SHEETS).join(', ')}`);
}
const isSheet = n => /^sheet\d+_/.test(n);
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
    if (isSheet(name)) add(name, '캔버스 (최대 2048)', img.w <= 2048 && img.h <= 2048, `${img.w}x${img.h}`);
    else add(name, '캔버스 1024x1024', img.w === SIZE && img.h === SIZE, `${img.w}x${img.h}`);
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
if (IS_BODY && imgs.b00_master) {
    const img = imgs.b00_master, m = mask(img), w = img.w;
    const rows = []; for (let y = 0; y < img.h; y++) { let c = 0; for (let x = 0; x < w; x++) c += m[y * w + x]; rows.push(c); }
    const top = rows.findIndex(c => c > 0), foot = img.h - 1 - [...rows].reverse().findIndex(c => c > 0);
    let neck = -1, minW = 1e9;
    for (let y = top + 150; y < Math.min(top + 420, foot); y++) if (rows[y] > 0 && rows[y] < minW) { minW = rows[y]; neck = y; }
    // 턱(머리 아래 끝): 목의 가장 좁은 곳에서 위로 올라가며 폭이 목 폭의 1.3배를 넘는 첫 줄. 사양 2.1의 턱 y=460 기준(R03 A-32)
    let chin = neck;
    while (chin > top && rows[chin - 1] <= minW * 1.3) chin--;
    chin--;
    const head = chin - top, height = foot - top + 1;
    const inR = (v, [a, b]) => v >= a && v <= b;
    add('b00_master', '머리 꼭대기 y', inR(top, B00.top), `${top} (사양 ${B00.top.join('-')})`);
    add('b00_master', '발바닥 y', inR(foot, B00.foot), `${foot} (사양 ${B00.foot.join('-')})`);
    add('b00_master', '머리 높이', inR(head, B00.head), `${head}px, 턱 y=${chin}, 목(가장 좁은 곳) y=${neck} (사양 ${B00.head.join('-')}, 턱 y 약 460)`);
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

// 파츠 시트 (사양 v2 2.2절, 3절): 파츠 개수, 간격, 부스러기
if (!V1 && !IS_BODY) {
    for (const [name, img] of Object.entries(imgs)) {
        if (!isSheet(name)) continue;
        const { labels, comps } = components(mask(img), img.w, img.h);
        const parts = comps.filter(c => c.area >= PART_MIN_AREA), crumbs = comps.length - parts.length;
        const range = SHEETS[name];
        if (range) add(name, '파츠 개수', parts.length >= range[0] && parts.length <= range[1],
            `${parts.length}개 (기대 ${range[0] === range[1] ? range[0] : range.join('-')}). ${parts.length < range[0] ? '적으면 파츠끼리 붙었거나 빠진 것' : parts.length > range[1] ? '많으면 떨어진 조각이 있거나 추가 파츠' : ''}`, parts.length < range[0] ? '실패' : (parts.length > range[1] ? '경고' : '통과'));
        else add(name, '파츠 개수', true, `${parts.length}개`, '정보');
        add(name, '부스러기', crumbs === 0, `${PART_MIN_AREA}px 미만 조각 ${crumbs}개 (떨어진 장식이나 배경 얼룩)`, crumbs === 0 ? '통과' : '경고');
        let minGap = Infinity, pair = null;
        for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
            const g = componentGap(labels, img.w, parts[i], parts[j], 200);
            if (g < minGap) { minGap = g; pair = [i, j]; }
        }
        if (parts.length > 1) add(name, '파츠 사이 간격', minGap >= PART_GAP, `가장 가까운 두 파츠 ${minGap >= 200 ? '200px 이상' : Math.round(minGap) + 'px'} (최소 ${PART_GAP}px)`);
    }
}

// 조립 정합 (사양 v1 전용: 파츠를 제자리에 그렸을 때만 의미가 있다. v2는 자리 맞춤 도구의 남은 차이로 본다)
const refName = IS_BODY ? 'b00_master' : 'c00_complete';
if (V1 && imgs[refName]) {
    const ref = mask(imgs[refName]), union = new Uint8Array(SIZE * SIZE);
    for (const [name, img] of Object.entries(imgs)) {
        if (name === refName || img.w !== SIZE || img.h !== SIZE) continue;
        const m = mask(img);
        for (let i = 0; i < m.length; i++) if (m[i]) union[i] = 1;
        const out = outsidePct(m, ref, SIZE, SIZE, ALIGN_TOL);
        add(name, `기준(${refName}) 안에 있음`, out < 2, `기준에서 ${ALIGN_TOL}px 넘게 벗어난 픽셀 ${out.toFixed(2)}%`);
    }
    const missing = outsidePct(ref, union, SIZE, SIZE, ALIGN_TOL);
    add('(조립)', '기준을 파츠가 덮음', missing < 2, `기준 그림 중 어느 파츠에도 없는 부분 ${missing.toFixed(2)}%${!IS_BODY ? ' (칼집처럼 사양에서 뺀 부위가 있으면 그만큼 남는다)' : ''}`, missing < 2 ? '통과' : '경고');
}

// 자동으로 못 잡는 것
if (!IS_BODY) add('(전체)', '사람 확인 필요', true, '다른 부위가 섞였는지(예: 다리 파츠에 손·칼자루), 관절 끝이 둥근지, 표정 패치끼리 윤곽이 같은지. 자리 맞춤 후 모션 화면에서 확인한다', '정보');

// 출력
const fails = results.filter(r => r.level === '실패');
const warns = results.filter(r => r.level === '경고');
for (const r of results) if (r.level !== '통과' || process.env.VERBOSE) console.log(`[${r.level}] ${r.file.padEnd(20)} ${r.item}: ${r.detail}`);
console.log(`\n검사 ${results.length}항목: 실패 ${fails.length}, 경고 ${warns.length}. 배경 판정: 녹색 ${CHROMA_RULE.green} / 마젠타 ${CHROMA_RULE.magenta} / 투명 ${CHROMA_RULE.transparent}`);
const outDir = path.join(ROOT, 'test', 'build', 'check');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, path.basename(dir) + (V1 ? '_v1' : '') + '.json'), JSON.stringify({ checkedAt: new Date().toISOString(), kind, type: typeArg, results }, null, 1));
process.exit(fails.length ? 1 : 0);
