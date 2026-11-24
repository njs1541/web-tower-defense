/*
 * 리그를 게임 자산 폴더로 내보내기 (v0.55.32, 회의 안건 A-17, A-18)
 *
 * test/build/의 리그(rig.json + atlas.webp)를 assets/rig/<이름>/으로 복사한다. 게임에 필요한 파일만 옮기고(PNG, 파츠 조각 제외)
 * 경로를 새 위치에 맞게 고친다. CHARACTER_DATA의 rig 필드에 "assets/rig/<이름>/rig.json"을 넣으면 도감에서 대기 모션이 나온다.
 *   - v1(td-rig-char/1): 캐릭터 리그 + 공통 바디(body.json)를 assets/rig/<바디 폴더 이름>/에 함께 복사
 *   - v2(td-rig-char/2): 캐릭터 리그 + 뼈대(skeleton)를 assets/rig/skeletons/에 복사
 *
 * 사용법 (프로젝트 루트): node test/tools/publish_rig.mjs <rig.json> <이름>
 *   예: node test/tools/publish_rig.mjs test/build/liana/rig.json liana
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const [rigArg, name] = process.argv.slice(2);
if (!rigArg || !name) { console.log('사용법: node test/tools/publish_rig.mjs <rig.json> <이름>'); process.exit(2); }
const rigFile = path.resolve(rigArg), srcDir = path.dirname(rigFile);
const rig = JSON.parse(fs.readFileSync(rigFile, 'utf8'));
const OUT_ROOT = path.join(ROOT, 'assets', 'rig'), out = path.join(OUT_ROOT, name);
const copied = [];
const put = (src, dst) => { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); copied.push(path.relative(ROOT, dst)); };
const slim = r => { const o = { ...r, atlas: { webp: r.atlas.webp, w: r.atlas.w, h: r.atlas.h } }; return o; };

fs.rmSync(out, { recursive: true, force: true });
put(path.join(srcDir, rig.atlas.webp), path.join(out, rig.atlas.webp));
if (rig.format === 'td-rig-char/2') {
    const skelSrc = path.resolve(srcDir, rig.skeleton), skelDst = path.join(OUT_ROOT, 'skeletons', path.basename(skelSrc));
    put(skelSrc, skelDst);
    fs.writeFileSync(path.join(out, 'rig.json'), JSON.stringify({ ...slim(rig), skeleton: path.relative(out, skelDst).split(path.sep).join('/') }, null, 1));
} else {
    const bodySrc = path.resolve(srcDir, rig.body), body = JSON.parse(fs.readFileSync(bodySrc, 'utf8'));
    const bodyName = path.basename(path.dirname(bodySrc)), bodyOut = path.join(OUT_ROOT, bodyName);
    put(path.join(path.dirname(bodySrc), body.atlas.webp), path.join(bodyOut, body.atlas.webp));
    fs.writeFileSync(path.join(bodyOut, 'body.json'), JSON.stringify(slim(body), null, 1)); copied.push(path.relative(ROOT, path.join(bodyOut, 'body.json')));
    fs.writeFileSync(path.join(out, 'rig.json'), JSON.stringify({ ...slim(rig), body: path.relative(out, path.join(bodyOut, 'body.json')).split(path.sep).join('/') }, null, 1));
}
copied.push(path.relative(ROOT, path.join(out, 'rig.json')));
const bytes = copied.reduce((s, f) => s + fs.statSync(path.join(ROOT, f)).size, 0);
console.log(copied.join('\n'));
console.log(`합계 ${(bytes / 1024).toFixed(0)}KB → CHARACTER_DATA rig: "assets/rig/${name}/rig.json"`);
