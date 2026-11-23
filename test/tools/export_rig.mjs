/*
 * 파츠 전처리와 리그 데이터 내보내기 (v0.55.23, 회의 안건 A-06, A-08, A-11 시제품)
 *
 * 헤드리스 Edge로 test/body_parts_viewer.html을 열어, 뷰어가 만든 결과를 그대로 꺼낸다.
 *   1) 크로마키 투명화(뷰어 loadChromaImage)
 *   2) 관절 끝 자동 연장(뷰어 rebuildJointCaps, 바디 파츠만)
 *   2-1) 가장자리 녹색 번짐 제거
 *   3) 내용 영역 트림 후 아틀라스로 묶기(바디 1장, 캐릭터 1장)
 *   4) 리그 데이터: test/build/body_human/body.json(뼈대, 피벗, 바디 레이어), test/build/liana/rig.json(의상, 무기, 표정)
 * 게임은 DOM 렌더링이라 실행 중에 픽셀을 다룰 수 없으므로, 이 처리는 모두 빌드 시점에 끝낸다.
 *
 * 사용법 (프로젝트 루트): node test/tools/export_rig.mjs
 * 출력: test/build/ (다시 실행하면 덮어쓴다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, ensureServer, launchEdge, waitFor, saveDataUrl } from './lib.mjs';

const OUT = path.join(ROOT, 'test', 'build');
const WEBP_QUALITY = 0.9;

// 페이지 안에서 실행할 코드. 뷰어의 전역(BODY_PARTS_CONFIG 등)을 그대로 읽는다.
const PAGE_EXPORT = `(async () => {
  const z = {};
  RENDER_PIPELINE.forEach((s, i) => { z[s.kind === 'face' ? 'face' : s.id] = i; });
  const items = [];
  for (const p of BODY_PARTS_CONFIG) items.push({ id: p.id, group: 'body', kind: 'body', bone: p.id, z: z[p.id], src: capImages[p.id] || loadedImages[p.id], file: p.file });
  for (const c of LIANA_COSTUME_CONFIG) items.push({ id: c.id, group: 'char', kind: 'costume', bone: c.parent, z: z[c.id], src: loadedImages[c.id], file: c.file });
  for (const [k, f] of Object.entries(LIANA_FACES)) items.push({ id: k, group: 'char', kind: 'face', bone: 'b01', z: z.face, src: loadedImages[k], file: f.file });

  // 0) 녹색 번짐 제거: 투명 픽셀에서 2px 안쪽 가장자리만, G가 R, B보다 크면 max(R, B)로 낮춘다.
  //    파츠에 원래 녹색이 있으면 사양상 마젠타 배경으로 납품되므로 녹색 배경 파츠에서는 안전하다.
  let despilled = 0;
  for (const it of items) {
    const s = it.src, w = s.width, h = s.height, ctx = s.getContext('2d'), img = ctx.getImageData(0, 0, w, h), d = img.data;
    const near = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] !== 0) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h) near[yy * w + xx] = 1; }
    }
    for (let i = 0; i < w * h; i++) {
      if (!near[i] || d[i * 4 + 3] === 0) continue;
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], m = Math.max(r, b);
      if (g > m) { d[i * 4 + 1] = m; despilled++; }
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(img, 0, 0);
    it.src = c;
  }

  // 1) 트림
  const PAD = 1;
  for (const it of items) {
    const s = it.src, ctx = s.getContext('2d'), d = ctx.getImageData(0, 0, s.width, s.height).data;
    let x0 = s.width, y0 = s.height, x1 = -1, y1 = -1;
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      if (d[(y * s.width + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    x0 = Math.max(0, x0 - PAD); y0 = Math.max(0, y0 - PAD); x1 = Math.min(s.width - 1, x1 + PAD); y1 = Math.min(s.height - 1, y1 + PAD);
    it.x = x0; it.y = y0; it.w = x1 - x0 + 1; it.h = y1 - y0 + 1;
    const c = document.createElement('canvas'); c.width = it.w; c.height = it.h;
    c.getContext('2d').drawImage(s, x0, y0, it.w, it.h, 0, 0, it.w, it.h);
    it.trim = c;
    it.png = c.toDataURL('image/png');
    it.webp = c.toDataURL('image/webp', ${WEBP_QUALITY});
  }

  // 2) 그룹별 아틀라스 (높이순 선반 배치, 파츠 사이 2px 간격)
  const atlases = {};
  for (const group of ['body', 'char']) {
    const list = items.filter(i => i.group === group).sort((a, b) => b.h - a.h);
    const MAXW = 2048, GAP = 2;
    let x = 0, y = 0, rowH = 0, W = 0;
    for (const it of list) {
      if (x + it.w > MAXW) { x = 0; y += rowH + GAP; rowH = 0; }
      it.ax = x; it.ay = y; x += it.w + GAP; rowH = Math.max(rowH, it.h); W = Math.max(W, x);
    }
    const H = y + rowH;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    for (const it of list) g.drawImage(it.trim, it.ax, it.ay);
    atlases[group] = { w: W, h: H, png: c.toDataURL('image/png'), webp: c.toDataURL('image/webp', ${WEBP_QUALITY}) };
  }

  const bones = BODY_PARTS_CONFIG.map(p => ({ id: p.id, parent: p.parent, pivot: p.pivot, minRot: p.minRot, maxRot: p.maxRot }));
  return {
    bones, atlases, despilled,
    items: items.map(({ src, trim, ...rest }) => rest),
  };
})()`;

const server = await ensureServer();
const { cdp, close } = await launchEdge();
try {
    await cdp.navigate('http://localhost:8085/test/body_parts_viewer.html');
    await waitFor(cdp, `typeof capImages !== 'undefined' && capImages.b05 && loadedImages.c05`, 60000);
    const r = await cdp.evaluate(PAGE_EXPORT);
    console.log(`녹색 번짐 보정 픽셀 ${r.despilled}개`);
    if (cdp.errors.length) console.warn('페이지 오류:', cdp.errors);

    const report = { generatedAt: new Date().toISOString(), webpQuality: WEBP_QUALITY, despilledPixels: r.despilled, parts: [], atlases: {} };
    for (const group of ['body', 'char']) {
        const dir = path.join(OUT, group === 'body' ? 'body_human' : 'liana');
        fs.rmSync(dir, { recursive: true, force: true });
        const a = r.atlases[group];
        report.atlases[group] = {
            w: a.w, h: a.h,
            png: saveDataUrl(a.png, path.join(dir, 'atlas.png')),
            webp: saveDataUrl(a.webp, path.join(dir, 'atlas.webp')),
        };
        for (const it of r.items.filter(i => i.group === group)) {
            const srcFile = path.join(ROOT, 'test', 'incoming', group === 'body' ? 'body_human' : 'char_liana', it.file);
            report.parts.push({
                id: it.id, group, w: it.w, h: it.h, areaPct: +(100 * it.w * it.h / (1024 * 1024)).toFixed(2),
                original: fs.statSync(srcFile).size,
                trimPng: saveDataUrl(it.png, path.join(dir, 'parts', `${it.id}.png`)),
                trimWebp: Buffer.from(it.webp.split(',')[1], 'base64').length,
            });
        }
    }

    const layer = it => ({ id: it.id, kind: it.kind, bone: it.bone, z: it.z, x: it.x, y: it.y, w: it.w, h: it.h, ax: it.ax, ay: it.ay });
    const bodyJson = {
        format: 'td-rig-body/1', race: 'human', canvas: 1024,
        note: '시제품. 현재 b00은 사양 밖(임시본)이라 피벗과 좌표는 새 b00 납품 후 다시 만든다(B-01).',
        atlas: { png: 'atlas.png', webp: 'atlas.webp', w: r.atlases.body.w, h: r.atlases.body.h },
        bones: r.bones,
        layers: r.items.filter(i => i.group === 'body').map(layer),
    };
    const rigJson = {
        format: 'td-rig-char/1', id: 'liana', body: '../body_human/body.json', canvas: 1024,
        atlas: { png: 'atlas.png', webp: 'atlas.webp', w: r.atlases.char.w, h: r.atlases.char.h },
        faces: { neutral: 'c03', blink: 'c04', attack: 'c05' },
        layers: r.items.filter(i => i.group === 'char').map(layer),
    };
    fs.writeFileSync(path.join(OUT, 'body_human', 'body.json'), JSON.stringify(bodyJson, null, 1));
    fs.writeFileSync(path.join(OUT, 'liana', 'rig.json'), JSON.stringify(rigJson, null, 1));
    fs.writeFileSync(path.join(OUT, 'export_report.json'), JSON.stringify(report, null, 1));

    const sum = k => report.parts.reduce((s, p) => s + p[k], 0);
    const kb = n => (n / 1024).toFixed(0) + 'KB';
    console.log(`파츠 ${report.parts.length}개  원본 ${kb(sum('original'))}  트림 PNG ${kb(sum('trimPng'))}  트림 WebP(q${WEBP_QUALITY}) ${kb(sum('trimWebp'))}`);
    for (const [g, a] of Object.entries(report.atlases)) console.log(`아틀라스 ${g}: ${a.w}x${a.h}  PNG ${kb(a.png)}  WebP ${kb(a.webp)}`);
} finally {
    close();
    if (server) server.kill();
}
