/*
 * 픽셀 이펙트 스프라이트 생성기 (v0.55.18)
 * scratch/pixelfx/(patch-gg/pixelfx의 일부, MIT)의 코드 이펙트를 프레임별로 렌더링해
 * assets/fx/<키>.png(가로 한 줄 스트립)와 js/pixel_fx_data.js(프레임 정보)를 만든다.
 * 게임은 DOM 렌더링이라 pixelfx 런타임을 싣지 않고, 구운 스트립을 CSS steps() 애니메이션으로 재생한다(js/pixel_fx.js).
 *
 * 사용법 (프로젝트 루트): node scratch/build_pixel_fx.mjs [키 ...]
 *   키를 주면 그 이펙트만 다시 만든다. 데이터 파일은 항상 전체를 다시 쓴다.
 *
 * 항목 설명
 *   id      pixelfx 이펙트 경로(scratch/pixelfx/src/fx/<id>.js)
 *   from/to 원본 시간(초) 중 쓸 구간. 타워 디펜스는 타격이 잦아 짧게 자른다.
 *   fade    잘린 구간 끝에서 투명하게 사라지는 비율(0-1). 연기가 뚝 끊기지 않게 한다.
 *   anchor  center = 칸 중앙(타격점), ground = 칸 아래쪽(바닥에 서는 이펙트)
 *   options pixelfx 옵션(palette 등). palette는 어두운 색에서 밝은 색 순서.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEffect, renderFrames, FX_DIR } from './pixelfx/tools/lib/fxlib.mjs';
import { encodePNG } from './pixelfx/tools/lib/png.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'fx');
const DATA_FILE = path.join(ROOT, 'js', 'pixel_fx_data.js');

const PURPLE = ['#2e1065', '#6d28d9', '#a855f7', '#d8b4fe', '#f5f3ff', '#ffffff'];

const EFFECTS = [
    // 타워 타격 (잦으므로 0.5-0.8초)
    { key: 'hit_ranged', id: 'impacts/hit-spark', fps: 20, to: 0.5, fade: 0.3, anchor: 'center' },
    { key: 'hit_melee', id: 'impacts/blunt-hit', fps: 20, to: 0.6, fade: 0.35, anchor: 'center' },
    { key: 'hit_sniper', id: 'impacts/bullet-impact', fps: 20, to: 0.7, fade: 0.35, anchor: 'center' },
    { key: 'hit_ice', id: 'ice/snowflake-burst', fps: 20, to: 0.9, fade: 0.4, anchor: 'ground' },
    { key: 'hit_shock', id: 'lightning/zap-hit', fps: 20, to: 0.7, fade: 0.3, anchor: 'center' },
    { key: 'hit_crit', id: 'impacts/crit-hit', fps: 20, to: 0.7, fade: 0.3, anchor: 'center' },
    { key: 'hit_hero_u', id: 'impacts/hit-spark', fps: 20, to: 0.5, fade: 0.3, anchor: 'center', options: { palette: PURPLE } },
    // 광역, 처치
    { key: 'explosion', id: 'explosions/small-explosion', fps: 12, to: 1.0, fade: 0.4, anchor: 'ground' },
    { key: 'implosion', id: 'explosions/implosion', fps: 12, to: 1.65, fade: 0.2, anchor: 'center' },
    { key: 'death', id: 'spawn/poof', fps: 12, to: 0.8, fade: 0.4, anchor: 'ground' },
    { key: 'boss_death', id: 'explosions/big-explosion', fps: 12, to: 1.4, fade: 0.4, anchor: 'ground' },
    // 스펠 룬
    { key: 'spell_thunder', id: 'lightning/lightning-strike', fps: 12, from: 0.6, to: 1.8, fade: 0.35, anchor: 'ground' },
    { key: 'spell_meteor', id: 'fire/meteor', fps: 12, to: 1.6, fade: 0.35, anchor: 'ground' },
    { key: 'spell_tornado', id: 'nature/tornado', fps: 12, to: 2.0, fade: 0.25, anchor: 'ground' },
    { key: 'spell_warp', id: 'arcane/mana-burst', fps: 12, to: 1.2, fade: 0.35, anchor: 'ground' },
    { key: 'spell_bless', id: 'holy/feather-burst', fps: 12, to: 1.4, fade: 0.35, anchor: 'center' },
    { key: 'spell_gold', id: 'pickups/collect-burst', fps: 12, to: 1.4, fade: 0.3, anchor: 'center' },
];

const ALPHA_MIN = 8; // 이보다 옅은 픽셀은 자르기 범위 계산에서 뺀다
const ALPHA_STEP = 16; // 반투명 알파 단계 폭
const COLOR_STEP = 8; // 반투명 픽셀 색 단계 폭 (불투명 픽셀은 원색 유지)

/** 용량 줄이기: 반투명 픽셀(주로 빛 번짐)의 알파와 색을 단계화하고, 완전 투명 픽셀은 색을 비운다 */
function quantize(px) {
    for (let j = 0; j < px.length; j += 4) {
        let a = px[j + 3];
        if (a === 255) continue;
        a = a < ALPHA_MIN ? 0 : Math.min(255, Math.round(a / ALPHA_STEP) * ALPHA_STEP);
        px[j + 3] = a;
        if (a === 0) { px[j] = px[j + 1] = px[j + 2] = 0; continue; }
        for (let c = 0; c < 3; c++) px[j + c] = Math.min(255, Math.round(px[j + c] / COLOR_STEP) * COLOR_STEP);
    }
}

async function build(e) {
    const fx = await loadEffect(e.id, FX_DIR);
    const r = renderFrames(fx, { fps: e.fps, bg: 'none', actor: false, options: e.options });
    const { w, h } = r;
    const from = Math.round((e.from || 0) * e.fps);
    const to = Math.min(r.frames.length, Math.round((e.to ?? fx.meta.duration) * e.fps) + 1);
    const frames = r.frames.slice(from, to).map(f => new Uint8ClampedArray(f.clear));

    // 끝부분 페이드
    const n = frames.length, fade = e.fade || 0;
    frames.forEach((px, i) => {
        const p = n > 1 ? i / (n - 1) : 0;
        if (fade <= 0 || p <= 1 - fade) return;
        const k = Math.max(0, (1 - p) / fade);
        for (let j = 3; j < px.length; j += 4) px[j] = Math.round(px[j] * k);
    });

    for (const px of frames) quantize(px);

    // 전체 프레임 기준 내용 영역과 마지막으로 보이는 프레임
    let x0 = w, y0 = h, x1 = -1, y1 = -1, last = -1;
    frames.forEach((px, i) => {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            if (px[(y * w + x) * 4 + 3] < ALPHA_MIN) continue;
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            last = i;
        }
    });
    if (last < 0) throw new Error(`${e.key}: 보이는 픽셀이 없다`);
    const kept = frames.slice(0, last + 1);
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1, cnt = kept.length;

    const strip = new Uint8ClampedArray(cw * cnt * ch * 4);
    kept.forEach((px, i) => {
        for (let y = 0; y < ch; y++) {
            const s = ((y + y0) * w + x0) * 4, d = (y * cw * cnt + i * cw) * 4;
            strip.set(px.subarray(s, s + cw * 4), d);
        }
    });
    const file = path.join(OUT_DIR, `${e.key}.png`);
    fs.writeFileSync(file, encodePNG(cw * cnt, ch, strip));
    const [ox, oy] = fx.meta.origin;
    return {
        src: `assets/fx/${e.key}.png`, w: cw, h: ch, frames: cnt, fps: e.fps,
        px: ox - x0, py: oy - y0, anchor: e.anchor, from: e.id, bytes: fs.statSync(file).size,
    };
}

const only = process.argv.slice(2);
fs.mkdirSync(OUT_DIR, { recursive: true });
const data = {};
let total = 0;
for (const e of EFFECTS) {
    const file = path.join(OUT_DIR, `${e.key}.png`);
    let info;
    if (only.length && !only.includes(e.key) && fs.existsSync(file)) {
        // 다시 만들지 않는 항목은 기존 데이터 파일 값을 쓴다
        const prev = fs.existsSync(DATA_FILE) ? fs.readFileSync(DATA_FILE, 'utf8').match(new RegExp(`^\\s*${e.key}: (\\{.*\\}),?$`, 'm')) : null;
        if (!prev) throw new Error(`${e.key}: 기존 데이터가 없어 다시 만들어야 한다`);
        info = JSON.parse(prev[1]);
    } else {
        info = await build(e);
        console.log(`${e.key.padEnd(14)} ${e.id.padEnd(28)} ${info.w}x${info.h} x${info.frames}  ${(info.bytes / 1024).toFixed(1)}KB`);
    }
    total += info.bytes;
    data[e.key] = info;
}

const lines = Object.entries(data).map(([k, v]) => `    ${k}: ${JSON.stringify(v)},`);
fs.writeFileSync(DATA_FILE, [
    '// 자동 생성 파일: node scratch/build_pixel_fx.mjs 가 만든다. 직접 고치지 말고 스크립트의 EFFECTS를 고친 뒤 다시 실행한다.',
    '// 원본: patch-gg/pixelfx (MIT, scratch/pixelfx/LICENSE). w/h는 한 프레임 크기, px/py는 프레임 안 기준점(타격점 또는 바닥).',
    'const PIXEL_FX_SHEETS = {',
    ...lines,
    '};',
    '',
].join('\n'));
console.log(`합계 ${(total / 1024).toFixed(1)}KB, ${Object.keys(data).length}종 -> ${path.relative(ROOT, DATA_FILE)}`);
