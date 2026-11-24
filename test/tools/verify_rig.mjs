/*
 * DOM 리그 시제품 검증 (v0.55.23, 회의 안건 A-01, A-05, A-10)
 *
 * 헤드리스 Edge로 test/proto/rig_dom.html을 열어 다음을 측정한다.
 *   1) 정지 자세(모든 관절 0도) 조립 결과와 c00 완성본의 위치 일치(5px 허용)
 *   2) 모션별 관절 벌어짐: adaptive(30fps + 빠른 구간 추가, R02 A-15) / dense(30fps 고정) / sparse(한 바퀴 6개)
 *   3) 페이지 오류 여부, 확인용 스크린샷(test/build/verify/)
 * 결과: test/build/verify/verify_report.json
 *
 * 사용법 (프로젝트 루트): node test/tools/verify_rig.mjs [--rig test/build/rig_v2/이름/rig.json] [--c00 완성본.png] [--out 폴더 이름]
 *   인수가 없으면 v1 리아나(test/build/liana/rig.json)를 검증한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ensureServer, launchEdge, waitFor, decodePNG, isBackground, saveDataUrl } from './lib.mjs';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const RIG = opt('rig', null), C00 = path.resolve(opt('c00', path.join(ROOT, 'test', 'incoming', 'char_liana', 'c00_complete.png')));
const OUT = path.join(ROOT, 'test', 'build', opt('out', 'verify'));
fs.mkdirSync(OUT, { recursive: true });

async function shot(cdp, file) {
    const r = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1024, height: 1024, scale: 1 } });
    saveDataUrl('data:image/png;base64,' + r.result.data, file);
}

/** 두 마스크 비교. tol 픽셀 이내로 상대 마스크가 있으면 일치로 본다. */
function compareMasks(a, b, w, h, tol) {
    const dilate = m => {
        const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            let v = 0; for (let k = -tol; k <= tol && !v; k++) { const xx = x + k; if (xx >= 0 && xx < w && m[y * w + xx]) v = 1; } tmp[y * w + x] = v;
        }
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            let v = 0; for (let k = -tol; k <= tol && !v; k++) { const yy = y + k; if (yy >= 0 && yy < h && tmp[yy * w + x]) v = 1; } out[y * w + x] = v;
        }
        return out;
    };
    const da = dilate(a), db = dilate(b);
    let na = 0, nb = 0, aOut = 0, bOut = 0;
    for (let i = 0; i < w * h; i++) {
        if (a[i]) { na++; if (!db[i]) aOut++; }
        if (b[i]) { nb++; if (!da[i]) bOut++; }
    }
    return { pixelsA: na, pixelsB: nb, aOutsideBpct: +(100 * aOut / na).toFixed(2), bOutsideApct: +(100 * bOut / nb).toFixed(2) };
}

const server = await ensureServer();
const { cdp, close } = await launchEdge();
const report = { generatedAt: new Date().toISOString() };
try {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 1024, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await cdp.navigate('http://localhost:8085/test/proto/rig_dom.html?bake' + (RIG ? '&rig=' + encodeURIComponent('/' + path.relative(ROOT, path.resolve(RIG)).split(path.sep).join('/')) : ''));
    await waitFor(cdp, `window.__rig && window.__rig.ready`);
    await cdp.evaluate(`document.fonts.ready.then(() => Promise.all([...new Set(__rig.model.layers.map(l => l.atlas))].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }))))`);

    // 1) 정지 자세 vs c00
    await cdp.evaluate(`(() => { const { model, els, TDRig } = __rig;
      const rest = { rootY: 0, rot: {}, sy: {}, face: 'neutral' };
      for (const l of model.layers) { els[l.id].style.transform = 'matrix(' + TDRig.layerMatrix(model, rest, l).join(',') + ')'; els[l.id].style.opacity = (l.kind !== 'face' || l.id === model.faces.neutral) ? 1 : 0; }
    })()`);
    await new Promise(r => setTimeout(r, 300));
    const restFile = path.join(OUT, 'rest_pose.png');
    await shot(cdp, restFile);
    const rest = decodePNG(restFile), ref = decodePNG(C00);
    const ma = new Uint8Array(1024 * 1024), mb = new Uint8Array(1024 * 1024);
    for (let i = 0; i < 1024 * 1024; i++) {
        ma[i] = rest.rgba[i * 4 + 3] > 128 ? 1 : 0;
        const p = ref.rgba; mb[i] = isBackground(p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[i * 4 + 3]) ? 0 : 1;
    }
    report.restVsC00 = { tolerancePx: 5, ...compareMasks(ma, mb, 1024, 1024, 5), note: 'A = DOM 조립(정지 자세), B = c00 완성본' };

    // 2) 관절 벌어짐
    report.jointGap = {};
    for (const motion of ['idle', 'walk', 'attack', 'hit']) {
        report.jointGap[motion] = {};
        // adaptive: 30fps + 빠른 구간 추가(R02 A-15 기준), dense: 30fps 고정, sparse: 한 바퀴 6개
        for (const mode of ['adaptive', 'dense', 'sparse']) {
            report.jointGap[motion][mode] = await cdp.evaluate(`(() => { const { model, els, TDRig } = __rig;
              const keys = ${mode === 'sparse' ? 6 : `Math.round(TDRig.MOTIONS['${motion}'].cycle * 30)`};
              const anims = TDRig.animate(model, els, '${motion}', keys, ${mode === 'adaptive' ? '{ adaptive: { maxDeg: 3, depth: 2 } }' : '{}'});
              const frames = anims[0].effect.getKeyframes().length;
              const r = TDRig.measureJointGap(model, els, anims);
              anims.forEach(a => a.cancel());
              return { keys, frames, ...r };
            })()`);
        }
    }

    // 3) 모션 중간 자세 스크린샷 (눈으로 확인용)
    for (const [motion, t] of [['walk', 0.24], ['attack', 0.4], ['hit', 0.11]]) {
        await cdp.evaluate(`__rig.TDRig.renderStatic(__rig.model, __rig.els, '${motion}', ${t})`);
        await new Promise(r => setTimeout(r, 200));
        await shot(cdp, path.join(OUT, `${motion}.png`));
    }
    report.pageErrors = cdp.errors;
    fs.writeFileSync(path.join(OUT, 'verify_report.json'), JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1));
} finally {
    close();
    if (server) server.kill();
}
