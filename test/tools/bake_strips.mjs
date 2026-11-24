/*
 * 전장용 프레임 스트립 굽기 (v0.55.23, 회의 안건 A-03 시제품)
 *
 * test/proto/rig_dom.html(굽기 모드)에서 모션을 프레임마다 정지 자세로 그려 캡처하고,
 * 단계별 절반 축소로 줄여 가로 한 줄 스트립 PNG로 저장한다.
 * v0.55.30 (R02 A-14, A-24 ③): 프레임은 높이 72px 직사각형(가로는 무기 궤적만큼), 가로 중심은 몸통 루트(골반 피벗)에 고정해
 * 좌우 반전해도 몸이 제자리에 있다. 대기는 8fps, 나머지는 12fps. 무기가 1024 캔버스 밖으로 나가도 잘리지 않게 여백(PAD)을 둔다.
 * pixelfx(v0.55.18)와 같은 방식이라 게임은 div 하나 + CSS steps()로 재생한다.
 *
 * 사용법 (프로젝트 루트): node test/tools/bake_strips.mjs [--rig test/build/rig_v2/이름/rig.json] [--out 출력 폴더]
 *   인수가 없으면 v1 리아나를 굽는다.
 * 출력: test/build/liana/strips/<모션>.png, test/build/liana/strips/strips.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ensureServer, launchEdge, waitFor, saveDataUrl, decodePNG } from './lib.mjs';

const FRAME_H = 72;   // 프레임 높이: 화면 36px의 2배(고해상도 화면 대비). 가로는 내용 비율로 정한다
const DISPLAY_H = 36; // 전장 유닛 표시 높이
const PAD = 256;      // 굽기 화면 여백(무기가 캔버스 밖으로 나가는 경우)
// 대기는 호흡 한 번만 굽는다. 눈 깜빡임은 36px에서 1px도 안 되어 보이지 않는다(R02 A-14: 대기 8fps, 동작 12fps).
const BAKE = [
    { motion: 'idle', cycleScale: 0.5, fps: 8 },
    { motion: 'walk', fps: 12 },
    { motion: 'attack', fps: 12 },
    { motion: 'hit', fps: 12 },
];
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const RIG = opt('rig', null);
const OUT = path.resolve(opt('out', RIG ? path.join(path.dirname(path.resolve(RIG)), 'strips') : path.join(ROOT, 'test', 'build', 'liana', 'strips')));

const PAGE_HELPERS = `window.__bake = {
  down(b64, fw, fh) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        let c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        while (c.width / 2 >= fw && c.height / 2 >= fh) { // 절반씩 줄이면 한 번에 줄일 때보다 가는 선이 덜 사라진다
          const n = document.createElement('canvas'); n.width = Math.round(c.width / 2); n.height = Math.round(c.height / 2);
          const g = n.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, n.width, n.height); c = n;
        }
        const f = document.createElement('canvas'); f.width = fw; f.height = fh;
        const g = f.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(c, 0, 0, fw, fh);
        this.frames.push(f); res(true);
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  },
  frames: [],
  strip() {
    const n = this.frames.length, s = this.frames[0].width, h = this.frames[0].height;
    const c = document.createElement('canvas'); c.width = n * s; c.height = h;
    const g = c.getContext('2d'); this.frames.forEach((f, i) => g.drawImage(f, i * s, 0));
    this.frames = [];
    return { png: c.toDataURL('image/png'), webp: c.toDataURL('image/webp', 0.9) };
  },
};`;

const server = await ensureServer();
const { cdp, close } = await launchEdge();
try {
    const VW = 1024 + PAD * 2;
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: VW, height: VW, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await cdp.navigate(`http://localhost:8085/test/proto/rig_dom.html?bake&pad=${PAD}` + (RIG ? '&rig=' + encodeURIComponent('/' + path.relative(ROOT, path.resolve(RIG)).split(path.sep).join('/')) : ''));
    await waitFor(cdp, `window.__rig && window.__rig.ready`);
    await cdp.evaluate(`Promise.all([...new Set(__rig.model.layers.map(l => l.atlas))].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })))`);
    await cdp.evaluate(PAGE_HELPERS);

    const cycleOf = async m => cdp.evaluate(`__rig.TDRig.MOTIONS['${m}'].cycle`);
    const plan = [];
    for (const b of BAKE) {
        const cycle = (await cycleOf(b.motion)) * (b.cycleScale || 1);
        const n = Math.max(2, Math.round(cycle * b.fps));
        plan.push({ ...b, cycle, n });
    }

    // 1단계: 전체 프레임을 1024로 캡처해 모든 모션의 공통 내용 영역을 구한다(모션끼리 기준점이 같아야 한다)
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    const tmp = path.join(OUT, '_tmp.png');
    fs.mkdirSync(OUT, { recursive: true });
    for (const p of plan) {
        for (let i = 0; i < p.n; i++) {
            await cdp.evaluate(`__rig.TDRig.renderStatic(__rig.model, __rig.els, '${p.motion}', ${(i / p.n) * p.cycle})`);
            const r = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: VW, height: VW, scale: 1 } });
            fs.writeFileSync(tmp, Buffer.from(r.result.data, 'base64'));
            const im = decodePNG(tmp);
            for (let y = 0; y < VW; y++) for (let x = 0; x < VW; x++) {
                if (im.rgba[(y * VW + x) * 4 + 3] < 8) continue;
                if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
        }
    }
    fs.rmSync(tmp, { force: true });

    // 직사각형 영역: 세로는 내용 전체, 가로는 몸통 루트(골반 피벗)를 중심으로 좌우 대칭(반전해도 몸이 제자리)
    const rootX = (await cdp.evaluate(`(() => { const b = Object.values(__rig.model.bones).find(b => !b.parent); return b.pivot[0]; })()`)) + PAD;
    const halfW = Math.max(rootX - x0, x1 - rootX) + 4;
    const rh = (y1 - y0 + 1) + 8;
    let fw = Math.round(FRAME_H * (2 * halfW) / rh); if (fw % 2) fw++;
    const rw = Math.round(fw * rh / FRAME_H); // 프레임 비율에 맞춘 실제 캡처 폭
    const region = { x: Math.round(rootX - rw / 2), y: y0 - 4, w: rw, h: rh };

    // 2단계: 영역만 캡처해 축소
    const data = { frameW: fw, frameH: FRAME_H, displayH: DISPLAY_H, displayW: Math.round(DISPLAY_H * fw / FRAME_H), anchorX: fw / 2,
        footY: +((y1 - region.y) / rh * FRAME_H).toFixed(1), region: { ...region, x: region.x - PAD, y: region.y - PAD }, pad: PAD, motions: {} };
    let total = 0;
    for (const p of plan) {
        for (let i = 0; i < p.n; i++) {
            await cdp.evaluate(`__rig.TDRig.renderStatic(__rig.model, __rig.els, '${p.motion}', ${(i / p.n) * p.cycle})`);
            const r = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: region.x, y: region.y, width: region.w, height: region.h, scale: 1 } });
            await cdp.evaluate(`__bake.down(${JSON.stringify(r.result.data)}, ${fw}, ${FRAME_H})`);
        }
        const s = await cdp.evaluate(`__bake.strip()`);
        const png = saveDataUrl(s.png, path.join(OUT, `${p.motion}.png`));
        const webp = saveDataUrl(s.webp, path.join(OUT, `${p.motion}.webp`));
        total += webp;
        data.motions[p.motion] = { frames: p.n, fps: p.fps, durationMs: Math.round(p.cycle * 1000), png: `${p.motion}.png`, webp: `${p.motion}.webp`, pngBytes: png, webpBytes: webp };
        console.log(`${p.motion.padEnd(7)} ${p.n}프레임 ${(p.cycle).toFixed(2)}초  PNG ${(png / 1024).toFixed(1)}KB  WebP ${(webp / 1024).toFixed(1)}KB`);
    }
    data.totalWebpBytes = total;
    fs.writeFileSync(path.join(OUT, 'strips.json'), JSON.stringify(data, null, 1));
    console.log(`영역 ${region.w}x${region.h} (캔버스 기준 ${region.x - PAD}, ${region.y - PAD}) -> 프레임 ${fw}x${FRAME_H}, 표시 ${data.displayW}x${DISPLAY_H}, WebP 합계 ${(total / 1024).toFixed(1)}KB`);
    if (cdp.errors.length) console.warn('페이지 오류:', cdp.errors);
} finally {
    close();
    if (server) server.kill();
}
