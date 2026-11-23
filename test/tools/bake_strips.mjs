/*
 * 전장용 프레임 스트립 굽기 (v0.55.23, 회의 안건 A-03 시제품)
 *
 * test/proto/rig_dom.html(굽기 모드)에서 모션을 프레임마다 정지 자세로 그려 캡처하고,
 * 단계별 절반 축소로 FRAME_PX 크기까지 줄여 가로 한 줄 스트립 PNG로 저장한다.
 * pixelfx(v0.55.18)와 같은 방식이라 게임은 div 하나 + CSS steps()로 재생한다.
 *
 * 사용법 (프로젝트 루트): node test/tools/bake_strips.mjs
 * 출력: test/build/liana/strips/<모션>.png, test/build/liana/strips/strips.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ensureServer, launchEdge, waitFor, saveDataUrl, decodePNG } from './lib.mjs';

const FPS = 12;
const FRAME_PX = 72; // 화면 36px의 2배(고해상도 화면 대비)
// 대기는 호흡 한 번만 굽는다. 눈 깜빡임은 36px에서 1px도 안 되어 보이지 않는다.
const BAKE = [
    { motion: 'idle', cycleScale: 0.5 },
    { motion: 'walk' },
    { motion: 'attack' },
    { motion: 'hit' },
];
const OUT = path.join(ROOT, 'test', 'build', 'liana', 'strips');

const PAGE_HELPERS = `window.__bake = {
  down(b64, size) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        let c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        while (c.width / 2 >= size) { // 절반씩 줄이면 한 번에 줄일 때보다 가는 선이 덜 사라진다
          const n = document.createElement('canvas'); n.width = Math.round(c.width / 2); n.height = Math.round(c.height / 2);
          const g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, n.width, n.height); c = n;
        }
        const f = document.createElement('canvas'); f.width = size; f.height = size;
        const g = f.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, size, size);
        this.frames.push(f); res(true);
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  },
  frames: [],
  strip() {
    const n = this.frames.length, s = this.frames[0].width;
    const c = document.createElement('canvas'); c.width = n * s; c.height = s;
    const g = c.getContext('2d'); this.frames.forEach((f, i) => g.drawImage(f, i * s, 0));
    this.frames = [];
    return { png: c.toDataURL('image/png'), webp: c.toDataURL('image/webp', 0.9) };
  },
};`;

const server = await ensureServer();
const { cdp, close } = await launchEdge();
try {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 1024, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await cdp.navigate('http://localhost:8085/test/proto/rig_dom.html?bake');
    await waitFor(cdp, `window.__rig && window.__rig.ready`);
    await cdp.evaluate(`Promise.all([...new Set(__rig.model.layers.map(l => l.atlas))].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })))`);
    await cdp.evaluate(PAGE_HELPERS);

    const cycleOf = async m => cdp.evaluate(`__rig.TDRig.MOTIONS['${m}'].cycle`);
    const plan = [];
    for (const b of BAKE) {
        const cycle = (await cycleOf(b.motion)) * (b.cycleScale || 1);
        const n = Math.max(2, Math.round(cycle * FPS));
        plan.push({ ...b, cycle, n });
    }

    // 1단계: 전체 프레임을 1024로 캡처해 모든 모션의 공통 내용 영역을 구한다(모션끼리 기준점이 같아야 한다)
    const shots = {};
    let x0 = 1024, y0 = 1024, x1 = -1, y1 = -1;
    const tmp = path.join(OUT, '_tmp.png');
    fs.mkdirSync(OUT, { recursive: true });
    for (const p of plan) {
        shots[p.motion] = [];
        for (let i = 0; i < p.n; i++) {
            await cdp.evaluate(`__rig.TDRig.renderStatic(__rig.model, __rig.els, '${p.motion}', ${(i / p.n) * p.cycle})`);
            const r = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1024, height: 1024, scale: 1 } });
            shots[p.motion].push(r.result.data);
            fs.writeFileSync(tmp, Buffer.from(r.result.data, 'base64'));
            const im = decodePNG(tmp);
            for (let y = 0; y < 1024; y++) for (let x = 0; x < 1024; x++) {
                if (im.rgba[(y * 1024 + x) * 4 + 3] < 8) continue;
                if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
    }
    fs.rmSync(tmp, { force: true });

    // 정사각형 영역: 아래(발)를 맞추고 가로는 내용 중앙
    const side = Math.max(x1 - x0 + 1, y1 - y0 + 1) + 8;
    const cx = Math.round((x0 + x1) / 2);
    const region = { x: cx - Math.floor(side / 2), y: y1 + 4 - side, side };

    // 2단계: 영역만 캡처해 축소
    const data = { fps: FPS, framePx: FRAME_PX, displayPx: 36, region, footY: +((y1 - region.y) / side * FRAME_PX).toFixed(1), motions: {} };
    let total = 0;
    for (const p of plan) {
        for (let i = 0; i < p.n; i++) {
            await cdp.evaluate(`__rig.TDRig.renderStatic(__rig.model, __rig.els, '${p.motion}', ${(i / p.n) * p.cycle})`);
            const r = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: region.x, y: region.y, width: side, height: side, scale: 1 } });
            await cdp.evaluate(`__bake.down(${JSON.stringify(r.result.data)}, ${FRAME_PX})`);
        }
        const s = await cdp.evaluate(`__bake.strip()`);
        const png = saveDataUrl(s.png, path.join(OUT, `${p.motion}.png`));
        const webp = saveDataUrl(s.webp, path.join(OUT, `${p.motion}.webp`));
        total += webp;
        data.motions[p.motion] = { frames: p.n, durationMs: Math.round(p.cycle * 1000), png: `${p.motion}.png`, webp: `${p.motion}.webp`, pngBytes: png, webpBytes: webp };
        console.log(`${p.motion.padEnd(7)} ${p.n}프레임 ${(p.cycle).toFixed(2)}초  PNG ${(png / 1024).toFixed(1)}KB  WebP ${(webp / 1024).toFixed(1)}KB`);
    }
    data.totalWebpBytes = total;
    fs.writeFileSync(path.join(OUT, 'strips.json'), JSON.stringify(data, null, 1));
    console.log(`영역 ${side}px 정사각형 (${region.x}, ${region.y}) -> ${FRAME_PX}px, WebP 합계 ${(total / 1024).toFixed(1)}KB`);
    if (cdp.errors.length) console.warn('페이지 오류:', cdp.errors);
} finally {
    close();
    if (server) server.kill();
}
