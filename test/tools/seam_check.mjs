/*
 * 이음새 검사 (v0.55.70, R04 A-38)
 *
 * 정지 자세로 구운 레이어(export_rig_v2.mjs의 layers: id, z, x, y, w, h, crop RGBA)를 받아 관절 쌍마다 두 가지를 잰다.
 *  1) 경계선: 위 파츠(z가 큰 쪽)의 가장자리가 아래 파츠 위에 놓이는 이음새 픽셀 중 진한 선(밝기 90 미만)의 비율과,
 *     이음새 양쪽 색. 양쪽이 모두 맨살 색인데 진한 선이 많으면 경고한다(사양 3절 3번 예외, v2.7, Gemini 보완). 재질 색 차이는 참고로 남긴다.
 *     옷 경계(소매 끝, 흉갑 테두리)는 재질이 달라 선이 있어도 정상이다.
 *  2) 관절 축(팔꿈치·손목만): 위 파츠에 가려진 아래 파츠 둥근 끝의 테두리 점에 원을 맞춰, 원 중심과 관절 축의 거리를 잰다.
 *     멀면 움직일 때 이음새가 틀어진다(리아나 팔꿈치 22px, 42px). 캐릭터별 관절 축 보정값(pivots)을 제안한다.
 */

// [아래 파츠, 위 후보 파츠, 관절 뼈, 둥근 끝 검사 여부]
const PAIRS = [
    ['arm_near_lower', 'arm_near_upper', 'arm_near_lower', true],
    ['arm_far_lower', 'arm_far_upper', 'arm_far_lower', true],
    ['hand_cap', 'arm_near_lower', 'hand_near', true],
    ['pelvis', 'torso', 'torso', false],
    ['head_base', 'torso', 'head', false],
    // 고관절은 치마·튜닉이 다리 윗부분을 넓게 덮어 둥근 끝 대신 다리 옆선에 원이 맞춰지므로 축 검사에서 뺀다(리아나 시험, v0.55.70)
    ['leg_near', 'pelvis', 'leg_near', false],
    ['leg_far', 'pelvis', 'leg_far', false],
];
const R_SEAM = 50, R_DOME = 70;
export const SEAM_RULE = { darkLum: 90, minEdge: 15, darkFrac: 0.5, domeWarnPx: 12 };
// 맨살 색 판정: 붉은 기가 뚜렷하다(R > G > B, R-G 30 이상, R-B 40-170). 리아나 값: 피부 R-G 54-64, 크림색 소매·깃 11-15, 은색 흉갑은 음수.
// 밝기 하한은 낮게 두어 어두운 피부도 잡는다. 리아나 한 명으로 정한 값이라 다른 피부색·의상은 A-43(세실리아)부터 다시 확인한다
const isSkin = c => !!c && c[0] > 90 && c[0] > c[1] && c[1] > c[2] && c[0] - c[1] >= 30 && c[0] - c[2] >= 40 && c[0] - c[2] <= 170;
const lum = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
// 재질 색 차이: RGB 차이에 색조(R-G, G-B) 차이를 더 무겁게 더한다. 크림색 소매와 살구색 피부처럼 밝기가 비슷한 경우를 가르기 위해서다
const matDist = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2])) / 3 + Math.abs((a[0] - a[1]) - (b[0] - b[1])) + Math.abs((a[1] - a[2]) - (b[1] - b[2]));

function sampler(l) {
    return (X, Y) => {
        const x = X - l.x, y = Y - l.y;
        if (x < 0 || y < 0 || x >= l.w || y >= l.h) return null;
        const i = (y * l.w + x) * 4;
        return l.crop[i + 3] ? [l.crop[i], l.crop[i + 1], l.crop[i + 2], l.crop[i + 3]] : null;
    };
}
const A = p => (p ? p[3] : 0);

/** 대수적 원 맞추기(Kasa). 반환 { cx, cy, r } */
function fitCircle(pts) {
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
    const n = pts.length;
    for (const [x, y] of pts) { const z = x * x + y * y; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z; }
    // [sxx sxy sx; sxy syy sy; sx sy n] [a b c]' = [sxz syz sz]'  → 원: x² + y² = a x + b y + c
    const M = [[sxx, sxy, sx, sxz], [sxy, syy, sy, syz], [sx, sy, n, sz]];
    for (let i = 0; i < 3; i++) {
        let p = i; for (let k = i + 1; k < 3; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
        [M[i], M[p]] = [M[p], M[i]];
        for (let k = 0; k < 3; k++) if (k !== i) { const f = M[k][i] / M[i][i]; for (let j = i; j < 4; j++) M[k][j] -= f * M[i][j]; }
    }
    const a = M[0][3] / M[0][0], b = M[1][3] / M[1][1], c = M[2][3] / M[2][2];
    const cx = a / 2, cy = b / 2;
    return { cx, cy, r: Math.sqrt(c + cx * cx + cy * cy) };
}

/**
 * layers: [{ id, z, x, y, w, h, crop }], pivotOf(boneId) → [x, y]
 * 반환: [{ pair, joint, upper, seam: {...}, dome: {...}, warnings: [] }]
 */
export function checkSeams(layers, pivotOf) {
    const byId = Object.fromEntries(layers.map(l => [l.id, l]));
    const out = [];
    for (const [lowId, upId, bone, domeCheck] of PAIRS) {
        const a = byId[lowId], b = byId[upId];
        if (!a || !b) continue;
        const [U, L] = a.z > b.z ? [a, b] : [b, a]; // 겹침 순서상 위·아래
        const su = sampler(U), sl = sampler(L), P = pivotOf(bone).map(Math.round);
        const res = { pair: `${lowId}~${upId}`, joint: bone, upper: U.id, warnings: [] };
        // 1) 경계선
        let edge = 0, dark = 0; const cu = [0, 0, 0, 0], cl = [0, 0, 0, 0];
        for (let Y = P[1] - R_SEAM; Y <= P[1] + R_SEAM; Y++) for (let X = P[0] - R_SEAM; X <= P[0] + R_SEAM; X++) {
            const pu = su(X, Y), pl = sl(X, Y);
            if (A(pu) > 200 && lum(pu[0], pu[1], pu[2]) >= 110) { cu[0] += pu[0]; cu[1] += pu[1]; cu[2] += pu[2]; cu[3]++; }
            if (A(pl) > 200 && A(pu) < 50 && lum(pl[0], pl[1], pl[2]) >= 110) { cl[0] += pl[0]; cl[1] += pl[1]; cl[2] += pl[2]; cl[3]++; }
            if (A(pu) <= 200) continue;
            let isEdge = false;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (A(su(X + dx, Y + dy)) < 50 && A(sl(X + dx, Y + dy)) > 200) isEdge = true;
            if (!isEdge) continue;
            edge++; if (lum(pu[0], pu[1], pu[2]) < SEAM_RULE.darkLum) dark++;
        }
        const mu = cu[3] ? cu.slice(0, 3).map(v => v / cu[3]) : null, ml = cl[3] ? cl.slice(0, 3).map(v => v / cl[3]) : null;
        const md = mu && ml ? +matDist(mu, ml).toFixed(1) : null;
        res.seam = { edgePx: edge, darkPct: edge ? +(100 * dark / edge).toFixed(1) : 0, materialDist: md, upperColor: mu && mu.map(Math.round), lowerColor: ml && ml.map(Math.round) };
        // 사양 3절 3번 예외는 '옷 경계 없이 같은 맨살로 이어지는 곳'이다. 색 차이만으로는 은색 흉갑과 크림색 튜닉을 같은 재질로 잘못 보므로(리아나 허리), 양쪽이 모두 맨살 색일 때만 본다
        res.seam.bothSkin = isSkin(mu) && isSkin(ml);
        if (edge >= SEAM_RULE.minEdge && dark / edge >= SEAM_RULE.darkFrac && res.seam.bothSkin)
            res.warnings.push(`${U.id} 가장자리가 ${L.id} 위에서 진한 선으로 끝난다(이음새 ${edge}px 중 ${res.seam.darkPct}%, 재질 차이 ${md}). 같은 재질 경계는 외곽선 없이 끝낸다(사양 3절 3번 예외)`);
        // 2) 둥근 끝 중심과 관절 축
        if (domeCheck) {
            const pts = [];
            for (let Y = P[1] - R_DOME; Y <= P[1] + R_DOME; Y++) for (let X = P[0] - R_DOME; X <= P[0] + R_DOME; X++) {
                if (A(sl(X, Y)) <= 200 || A(su(X, Y)) <= 200) continue; // 위 파츠에 가려진 아래 파츠
                let border = false;
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (A(sl(X + dx, Y + dy)) < 50) border = true;
                if (border) pts.push([X, Y]);
            }
            if (pts.length >= 20) {
                const c = fitCircle(pts), d = Math.hypot(c.cx - P[0], c.cy - P[1]);
                res.dome = { points: pts.length, center: [+c.cx.toFixed(1), +c.cy.toFixed(1)], radius: +c.r.toFixed(1), pivot: P, distPx: +d.toFixed(1) };
                if (c.r > 8 && c.r < 90 && d > SEAM_RULE.domeWarnPx)
                    res.warnings.push(`${L.id} 둥근 끝 중심(${Math.round(c.cx)}, ${Math.round(c.cy)})이 관절 축(${P.join(', ')})과 ${d.toFixed(0)}px 떨어져 있다. 움직일 때 이음새가 틀어질 수 있다. fit.json pivots.${bone} = [${Math.round(c.cx)}, ${Math.round(c.cy)}]를 검토한다`);
            } else res.dome = { points: pts.length, note: '가려진 둥근 끝이 거의 없어 재지 않음' };
        }
        out.push(res);
    }
    return out;
}
