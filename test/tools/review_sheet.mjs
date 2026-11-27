/*
 * 사람 확인용 장면 모음 (v0.55.70, R04 A-38)
 *
 * 리그를 헤드리스 Edge(test/proto/rig_dom.html 굽기 모드)로 열어, 정해 둔 자세마다 관절 주변을 확대해 한 장에 모은다.
 * 리아나 작업 때 매번 임시 스크립트로 만들던 확대 장면(팔꿈치, 손목, 목, 허리)을 한 번에 만든다.
 *   - 첫 줄: 자세별 전신
 *   - 다음 줄부터: 관절마다 자세별 확대(관절 위치를 그 자세의 뼈 행렬로 따라간다)
 * 출력: <out>/review.png, <out>/review.md(줄·칸 순서와 관절 좌표)
 *
 * 사용법 (프로젝트 루트): node test/tools/review_sheet.mjs --rig test/build/rig_v2/<이름>/rig.json [--out test/build/review_<이름>] [--zoom 2]
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ensureServer, launchEdge, waitFor, decodePNG } from './lib.mjs';
import { encodePNG } from '../../scratch/pixelfx/tools/lib/png.mjs';

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const RIG = opt('rig', null);
if (!RIG) { console.log('사용법: node test/tools/review_sheet.mjs --rig <rig.json> [--out 폴더] [--zoom 2]'); process.exit(2); }
const name = path.basename(path.dirname(path.resolve(RIG)));
const OUT = path.resolve(opt('out', path.join(ROOT, 'test', 'build', 'review_' + name)));
const ZOOM = +opt('zoom', 2), HALF = 70, TILE = HALF * 2 * ZOOM, BODY = 0.27;
// 자세: [모션, 한 바퀴 중 위치(0-1), 이름]. 공격 0.40은 뒤로 젖힘, 0.55는 내려벰(rig_runtime.js attack 키)
const FRAMES = [['idle', 0.1, '정지'], ['walk', 0.25, '이동 1'], ['walk', 0.75, '이동 2'], ['attack', 0.40, '공격 젖힘'], ['attack', 0.55, '공격 내려벰'], ['hit', 0.3, '피격']];
// 관절: [뼈, 이름]. 리그에 그 뼈에 붙은 레이어가 있을 때만 넣는다
const JOINTS = [['arm_near_lower', '가까운 팔꿈치'], ['hand_near', '가까운 손목'], ['arm_far_lower', '먼 팔꿈치'], ['head', '목'], ['torso', '허리'], ['leg_near', '가까운 고관절']];

fs.mkdirSync(OUT, { recursive: true });
const server = await ensureServer();
const { cdp, close } = await launchEdge();
const tmp = path.join(OUT, '_shot.png');
try {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 1024, deviceScaleFactor: 1, mobile: false });
    await cdp.navigate('http://localhost:8085/test/proto/rig_dom.html?bake&rig=' + encodeURIComponent('/' + path.relative(ROOT, path.resolve(RIG)).split(path.sep).join('/')));
    await waitFor(cdp, 'window.__rig && window.__rig.ready');
    await cdp.evaluate(`Promise.all([...new Set(__rig.model.layers.map(l => l.atlas))].map(u => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = u; })))`);
    const joints = JSON.parse(await cdp.evaluate(`JSON.stringify(${JSON.stringify(JOINTS)}.filter(([b]) => __rig.model.bones[b] && __rig.model.layers.some(l => l.bone === b || (b === 'hand_near' && l.bone === 'hand_near'))))`));
    const shots = [];
    for (const [motion, frac] of FRAMES) {
        const pos = JSON.parse(await cdp.evaluate(`(() => { const { model, els, TDRig } = __rig, M = TDRig.MOTIONS['${motion}'], t = ${frac} * M.cycle;
          TDRig.renderStatic(model, els, '${motion}', t);
          const pose = M.pose(t), out = {};
          for (const [b] of ${JSON.stringify(joints)}) { const m = TDRig.boneMatrix(model, pose, b), p = model.bones[b].pivot; out[b] = [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]]; }
          return JSON.stringify(out); })()`));
        await new Promise(r => setTimeout(r, 150));
        const r = await cdp.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(tmp, Buffer.from((r.result || r).data, 'base64'));
        shots.push({ img: decodePNG(tmp), pos });
    }
    fs.rmSync(tmp, { force: true });
    // 합치기: 흰 바탕, 칸 사이 회색 선
    const cols = FRAMES.length, bodyH = Math.round(1024 * BODY), rowsH = [bodyH, ...joints.map(() => TILE)];
    const W = cols * TILE, H = rowsH.reduce((a, b) => a + b, 0), o = new Uint8Array(W * H * 4).fill(255);
    const put = (img, sx, sy, scale, dx, dy, w, h) => {
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const X = Math.floor(sx + x / scale), Y = Math.floor(sy + y / scale), d = ((dy + y) * W + dx + x) * 4;
            if (X < 0 || Y < 0 || X >= img.w || Y >= img.h) continue;
            const i = (Y * img.w + X) * 4, a = img.rgba[i + 3] / 255;
            for (let c = 0; c < 3; c++) o[d + c] = img.rgba[i + c] * a + 255 * (1 - a);
        }
    };
    let y0 = 0;
    shots.forEach((s, c) => put(s.img, 512 - TILE / 2 / BODY, 0, BODY, c * TILE, 0, TILE, bodyH));
    y0 += bodyH;
    joints.forEach(([b]) => {
        shots.forEach((s, c) => { const [jx, jy] = s.pos[b]; put(s.img, jx - HALF, jy - HALF, ZOOM, c * TILE, y0, TILE, TILE);
            // 관절 위치 표시: 가운데 작은 빨간 십자
            for (let k = -6; k <= 6; k++) for (const [px, py] of [[c * TILE + TILE / 2 + k, y0 + TILE / 2], [c * TILE + TILE / 2, y0 + TILE / 2 + k]]) { const d = (Math.round(py) * W + Math.round(px)) * 4; o[d] = 230; o[d + 1] = 40; o[d + 2] = 40; } });
        y0 += TILE;
    });
    for (let c = 1; c < cols; c++) for (let y = 0; y < H; y++) { const d = (y * W + c * TILE) * 4; o[d] = o[d + 1] = o[d + 2] = 170; }
    let yy = 0; for (const h of rowsH.slice(0, -1)) { yy += h; for (let x = 0; x < W; x++) { const d = (yy * W + x) * 4; o[d] = o[d + 1] = o[d + 2] = 170; } }
    fs.writeFileSync(path.join(OUT, 'review.png'), encodePNG(W, H, o));
    const md = [`# 확인 장면 모음: ${name}`, '', `- 리그: \`${path.relative(ROOT, path.resolve(RIG)).replace(/\\/g, '/')}\`, 만든 시각 ${new Date().toISOString()}`, `- 칸(왼쪽부터): ${FRAMES.map(f => f[2]).join(' / ')}`,
        `- 줄(위부터): 전신 / ${joints.map(j => j[1]).join(' / ')}. 관절 칸은 ${ZOOM}배 확대, 빨간 십자가 관절 축`, '', '| 관절 | ' + FRAMES.map(f => f[2]).join(' | ') + ' |', '|---|' + FRAMES.map(() => '---|').join(''),
        ...joints.map(([b, l]) => `| ${l} | ` + shots.map(s => s.pos[b].map(v => Math.round(v)).join(', ')).join(' | ') + ' |'), '',
        '확인할 점: 이음새가 벌어지거나 틀어지는지, 위 파츠 경계에 맨살끼리 진한 선이 있는지, 무기가 손과 함께 도는지.'];
    fs.writeFileSync(path.join(OUT, 'review.md'), md.join('\n') + '\n');
    console.log(`장면 ${cols}개 x 관절 ${joints.length}개 → ${path.relative(ROOT, path.join(OUT, 'review.png'))} (${W}x${H}), 오류 ${JSON.stringify(cdp.errors)}`);
} finally {
    try { close(); } catch {}
    if (server) server.kill();
    setTimeout(() => process.exit(0), 500);
}
