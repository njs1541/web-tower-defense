/*
 * 자리 맞춤 핵심 코드 (v0.55.31, 회의 안건 A-21, A-24 ①)
 *
 * 따로 그린 파츠(사양 v2)를 메인 원화 c00 위에 맞추는 계산을 모은다.
 * 브라우저(test/proto/fit_tool.html, 전역 FitCore)와 Node(test/tools/*.mjs, require)에서 같이 쓴다. DOM, Canvas를 쓰지 않는다.
 *
 * 좌표 약속: 파츠 그림(잘라 낸 PNG, 크기 w x h)의 가운데를 원점으로, 정지 자세 캔버스(1024) 위의
 *   세계 좌표 = (tx, ty) + R(rot도) * S(scale) * (로컬 - (w/2, h/2))
 * 이 값(tx, ty, rot, scale)을 fit.json에 저장하고, export_rig_v2.mjs가 정지 좌표계로 미리 구워 넣는다(A-24 ①).
 */
(function (root) {
    'use strict';

    // ---------- 슬롯 정의 (ASSET_SPEC v2 5절, 6절) ----------
    // bone: 붙는 뼈. prior: 뼈대에서 예상 중심을 구하는 방법. win: 자동 맞춤 탐색 반경(px). z: 겹침 순서(아래 → 위).
    const SLOTS = {
        hair_back:      { label: '뒷머리', sheet: 1, bone: 'head', prior: 'head', win: 110, z: 1 },
        arm_far_upper:  { label: '먼 위팔', sheet: 3, bone: 'arm_far_upper', prior: 'arm_far_upper', win: 110, z: 2 },
        arm_far_lower:  { label: '먼 아래팔', sheet: 3, bone: 'arm_far_lower', prior: 'arm_far_lower', win: 120, z: 3 },
        weapon_sub:     { label: '보조무기', sheet: 4, bone: 'arm_far_lower', prior: 'hand_far', win: 220, z: 4 },
        skirt_back:     { label: '뒷자락', sheet: 2, bone: 'pelvis', prior: 'skirt', win: 110, z: 5 },
        leg_far:        { label: '먼 다리', sheet: 4, bone: 'leg_far', prior: 'leg_far', win: 120, z: 6 },
        leg_near:       { label: '가까운 다리', sheet: 4, bone: 'leg_near', prior: 'leg_near', win: 120, z: 7 },
        pelvis:         { label: '골반', sheet: 2, bone: 'pelvis', prior: 'pelvis', win: 110, z: 8 },
        torso:          { label: '상체', sheet: 2, bone: 'torso', prior: 'torso', win: 110, z: 9 },
        head_base:      { label: '머리 소체', sheet: 1, bone: 'head', prior: 'head', win: 90, z: 10 },
        face_neutral:   { label: '표정: 기본', sheet: 1, bone: 'head', prior: 'face', win: 90, z: 11, face: 'neutral' },
        face_blink:     { label: '표정: 눈 감음', sheet: 1, bone: 'head', prior: 'face', win: 90, z: 11, face: 'blink' },
        face_attack:    { label: '표정: 공격', sheet: 1, bone: 'head', prior: 'face', win: 90, z: 11, face: 'attack' },
        hair_front:     { label: '앞·옆머리', sheet: 1, bone: 'head', prior: 'head', win: 90, z: 12 },
        weapon_main:    { label: '주무기', sheet: 4, bone: 'arm_near_lower', prior: 'hand_near', win: 260, z: 13 },
        arm_near_upper: { label: '가까운 위팔', sheet: 3, bone: 'arm_near_upper', prior: 'arm_near_upper', win: 110, z: 14 },
        arm_near_lower: { label: '가까운 아래팔', sheet: 3, bone: 'arm_near_lower', prior: 'arm_near_lower', win: 120, z: 15 },
        hand_cap:       { label: '손가락 덮개(선택)', sheet: 4, bone: 'arm_near_lower', prior: 'hand_near', win: 120, z: 16 },
        // 대기형(5.2)
        lower:          { label: '하체(대기형)', sheet: 2, bone: 'pelvis', prior: 'lower', win: 140, z: 7 },
        arm_near:       { label: '가까운 팔(대기형)', sheet: 2, bone: 'arm_near_upper', prior: 'arm_near_whole', win: 140, z: 14 },
        arm_far:        { label: '먼 팔(대기형)', sheet: 2, bone: 'arm_far_upper', prior: 'arm_far_whole', win: 140, z: 2 },
        // 추가 파츠(A-04): 뼈는 사람이 고른다
        extra_1:        { label: '추가 1', sheet: 0, bone: 'head', prior: 'head', win: 200, z: 12 },
        extra_2:        { label: '추가 2', sheet: 0, bone: 'torso', prior: 'torso', win: 200, z: 9 },
    };

    /**
     * 시트 안 배치 순서(ASSET_SPEC v2 2.2절): 파츠를 5절 표 순서대로 왼쪽 위부터 읽는 순서로 그린다.
     * 같은 자리에 겹치는 파츠(머리 소체, 앞머리, 뒷머리, 표정)는 위치로 구분할 수 없어 이 순서로 이름을 정한다.
     * optional: 없을 수도 있는 슬롯. 개수가 하나 모자라면 이 슬롯을 빼고 맞춘다.
     */
    const SHEET_ORDER = {
        full: {
            1: { order: ['head_base', 'hair_front', 'hair_back', 'face_neutral', 'face_blink', 'face_attack'], optional: [] },
            2: { order: ['torso', 'pelvis', 'skirt_back'], optional: ['skirt_back'] },
            3: { order: ['arm_near_upper', 'arm_near_lower', 'arm_far_upper', 'arm_far_lower'], optional: [] },
            4: { order: ['leg_near', 'leg_far', 'weapon_main', 'weapon_sub'], optional: ['weapon_sub'] },
        },
        idle: {
            1: { order: ['head_base', 'hair_front', 'hair_back', 'face_neutral', 'face_blink'], optional: [] },
            2: { order: ['torso', 'lower', 'arm_near', 'arm_far'], optional: [] },
            3: { order: ['weapon_main', 'weapon_sub'], optional: ['weapon_sub'] },
        },
    };

    /** 파츠 상자 목록을 읽는 순서(행 → 왼쪽부터)로 정렬한 색인을 돌려준다. boxes: [{x, y, w, h}] */
    function readingOrder(boxes) {
        const idx = boxes.map((b, i) => i).sort((a, b) => (boxes[a].y + boxes[a].h / 2) - (boxes[b].y + boxes[b].h / 2));
        const rows = [];
        for (const i of idx) {
            const b = boxes[i], row = rows.find(r => {
                const ov = Math.min(r.y1, b.y + b.h) - Math.max(r.y0, b.y);
                return ov > 0.5 * Math.min(r.y1 - r.y0, b.h);
            });
            if (row) { row.items.push(i); row.y0 = Math.min(row.y0, b.y); row.y1 = Math.max(row.y1, b.y + b.h); }
            else rows.push({ y0: b.y, y1: b.y + b.h, items: [i] });
        }
        rows.sort((a, b) => a.y0 - b.y0);
        return rows.flatMap(r => r.items.sort((a, b) => boxes[a].x - boxes[b].x));
    }

    /** 순서 규칙으로 슬롯 이름을 정한다. 개수가 안 맞으면 null(점수로 추정해야 함) */
    function slotsByOrder(type, sheetNo, boxes) {
        const rule = (SHEET_ORDER[type] || {})[sheetNo];
        if (!rule) return null;
        let order = rule.order;
        if (boxes.length !== order.length) {
            const reduced = order.filter(s => !rule.optional.includes(s));
            if (boxes.length !== reduced.length) return null;
            order = reduced;
        }
        const res = new Array(boxes.length);
        readingOrder(boxes).forEach((bi, k) => { res[bi] = order[k]; });
        return res;
    }

    /** 뼈대(td-skeleton/1)에서 슬롯의 예상 중심을 구한다 */
    function priorCenter(skel, slotId) {
        const P = {}; skel.bones.forEach(b => { P[b.id] = b.pivot; });
        const g = skel.guide, mid = (a, b, t = 0.5) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        const ext = (a, b, t) => [b[0] + (b[0] - a[0]) * t, b[1] + (b[1] - a[1]) * t];
        const headC = [P.head[0], (g.headTop + g.chin) / 2];
        const handNear = ext(P.arm_near_upper, P.arm_near_lower, 0.9), handFar = ext(P.arm_far_upper, P.arm_far_lower, 0.9);
        switch (SLOTS[slotId].prior) {
            case 'head': return headC;
            case 'face': return [headC[0] + (P.head[1] - headC[1]) * 0.05, headC[1] + (g.chin - headC[1]) * 0.25];
            case 'torso': return mid(P.head, P.torso);
            case 'pelvis': return [P.pelvis[0], (P.torso[1] + P.leg_near[1]) / 2 + 10];
            case 'skirt': return [P.pelvis[0], P.leg_near[1] + (g.foot - P.leg_near[1]) * 0.15];
            case 'lower': return [P.pelvis[0], (P.pelvis[1] + g.foot) / 2];
            case 'arm_near_upper': return mid(P.arm_near_upper, P.arm_near_lower);
            case 'arm_near_lower': return ext(P.arm_near_upper, P.arm_near_lower, 0.55);
            case 'arm_far_upper': return mid(P.arm_far_upper, P.arm_far_lower);
            case 'arm_far_lower': return ext(P.arm_far_upper, P.arm_far_lower, 0.55);
            case 'arm_near_whole': return P.arm_near_lower;
            case 'arm_far_whole': return P.arm_far_lower;
            case 'leg_near': return [P.leg_near[0], (P.leg_near[1] + g.foot) / 2];
            case 'leg_far': return [P.leg_far[0], (P.leg_far[1] + g.foot) / 2];
            case 'hand_near': return handNear;
            case 'hand_far': return handFar;
        }
        return headC;
    }

    // ---------- 행렬 ----------
    /** 파츠 로컬(픽셀) → 세계 행렬 [a, b, c, d, e, f] */
    function partMatrix(t, w, h) {
        const r = (t.rot || 0) * Math.PI / 180, s = t.scale || 1, c = Math.cos(r) * s, n = Math.sin(r) * s;
        return [c, n, -n, c, t.tx - (c * w / 2 - n * h / 2), t.ty - (n * w / 2 + c * h / 2)];
    }

    // ---------- 그림 다루기 (RGBA 바이트 배열) ----------
    /** 배경 판정 마스크(1 = 배경). c00 같은 크로마키 원본용 */
    function bgMask(rgba, w, h) {
        const m = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) {
            const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2], a = rgba[i * 4 + 3];
            m[i] = (a < 20 || (g > 150 && r < 120 && b < 120) || (r > 200 && b > 200 && g < 80)) ? 1 : 0;
        }
        return m;
    }

    /** f배 축소(상자 평균). bg가 있으면 배경 비율이 절반 이상인 칸을 배경으로 본다. 알파가 있으면 알파 가중 평균 */
    function downsample(img, f) {
        const W = Math.floor(img.w / f), H = Math.floor(img.h / f), out = new Uint8ClampedArray(W * H * 4), bg = img.bg ? new Uint8Array(W * H) : null;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            let r = 0, g = 0, b = 0, a = 0, nb = 0, n = 0;
            for (let dy = 0; dy < f; dy++) for (let dx = 0; dx < f; dx++) {
                const i = (y * f + dy) * img.w + x * f + dx, al = img.rgba[i * 4 + 3] / 255;
                if (img.bg && img.bg[i]) { nb++; continue; }
                r += img.rgba[i * 4] * al; g += img.rgba[i * 4 + 1] * al; b += img.rgba[i * 4 + 2] * al; a += al; n++;
            }
            const o = (y * W + x) * 4;
            if (a > 0) { out[o] = r / a; out[o + 1] = g / a; out[o + 2] = b / a; }
            out[o + 3] = n ? Math.round(255 * a / (f * f)) : 0;
            if (bg) bg[y * W + x] = nb * 2 >= f * f ? 1 : 0;
        }
        return { w: W, h: H, rgba: out, bg };
    }

    /**
     * 파츠의 불투명 점 목록: [로컬x - w/2, 로컬y - h/2, r, g, b, 가중치] 반복.
     * 가중치: 어두운 선(외곽선, 눈, 입)은 4배. 무늬 없는 피부·천은 어디에 놓아도 색이 맞아 위치를 정하지 못하기 때문이다.
     */
    function partPoints(img, step, alphaMin = 200) {
        const pts = [];
        for (let y = 0; y < img.h; y += step) for (let x = 0; x < img.w; x += step) {
            const i = (y * img.w + x) * 4;
            if (img.rgba[i + 3] < alphaMin) continue;
            const r = img.rgba[i], g = img.rgba[i + 1], b = img.rgba[i + 2], lum = 0.3 * r + 0.59 * g + 0.11 * b;
            pts.push(x + 0.5 - img.w / 2, y + 0.5 - img.h / 2, r, g, b, lum < 90 ? 4 : 1);
        }
        return new Float32Array(pts);
    }
    const PS = 6; // 점 하나의 칸 수

    /**
     * 일치 점수(0-1): 파츠 점 중 c00의 같은 자리 색과 비슷한 점의 가중 비율. c00 배경 위에 떨어진 점은 불일치.
     * 크기를 줄여 무늬 없는 영역 안에 밀어 넣는 쪽으로 쏠리지 않게, 1배에서 멀어질수록 조금 깎는다.
     */
    function score(ref, pts, tx, ty, rot, scale, tol = 60) {
        const r = rot * Math.PI / 180, c = Math.cos(r) * scale, s = Math.sin(r) * scale, W = ref.w, H = ref.h, px = ref.rgba, bg = ref.bg;
        let hit = 0, tot = 0;
        for (let k = 0; k < pts.length; k += PS) {
            const wt = pts[k + 5]; tot += wt;
            const x = Math.round(tx + c * pts[k] - s * pts[k + 1]), y = Math.round(ty + s * pts[k] + c * pts[k + 1]);
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const i = y * W + x; if (bg[i]) continue;
            if (Math.abs(px[i * 4] - pts[k + 2]) + Math.abs(px[i * 4 + 1] - pts[k + 3]) + Math.abs(px[i * 4 + 2] - pts[k + 4]) < tol) hit += wt;
        }
        return tot ? (hit / tot) * Math.exp(-0.25 * Math.abs(Math.log(scale))) : 0;
    }

    /**
     * 자동 맞춤(하이브리드, R02 5.2): 예상 중심(prior) 주변 win 반경에서 이동·회전·크기를 거칠게 찾고 원래 해상도로 다듬는다.
     * ref: { w, h, rgba, bg } (c00), part: { w, h, rgba } (투명 배경 파츠)
     * 반환: { tx, ty, rot, scale, score }. score가 낮으면(0.4 미만) 가려진 파츠일 수 있으니 사람이 확인한다.
     */
    /** 축소본 묶음(1/8, 1/2). c00은 파츠마다 같으므로 한 번 만들어 opts.pyr로 넘기면 빠르다 */
    function pyramid(img) { return { 8: downsample(img, 8), 2: downsample(img, 2), 1: img }; }

    function autoFit(ref, part, prior, opts = {}) {
        const win = opts.win || 120;
        const rots = opts.rots || [-20, -15, -10, -5, 0, 5, 10, 15, 20], scales = opts.scales || [0.8, 0.9, 1.0, 1.1, 1.2];
        const RP = opts.pyr || pyramid(ref);
        // 1단계: 1/8 해상도 전역 탐색(예상 중심 ± win)
        const p8 = partPoints(downsample(part, 8), 1, 120);
        let best = { score: -1 };
        const cx = prior[0] / 8, cy = prior[1] / 8, R = Math.ceil(win / 8);
        if (p8.length) for (const rot of rots) for (const sc of scales) {
            for (let ty = cy - R; ty <= cy + R; ty += 0.5) for (let tx = cx - R; tx <= cx + R; tx += 0.5) {
                const s = score(RP[8], p8, tx, ty, rot, sc);
                if (s > best.score) best = { tx: tx * 8, ty: ty * 8, rot, scale: sc, score: s };
            }
        } else best = { tx: prior[0], ty: prior[1], rot: 0, scale: 1, score: 0 };
        if (opts.coarseOnly) return best;
        // 2단계: 1/2 해상도, 3단계: 원래 해상도에서 다듬기
        const levels = [[2, partPoints(downsample(part, 2), 1, 160), 12, 2, 4, 1, 0.06, 0.02], [1, partPoints(part, 2), 3, 1, 1, 0.5, 0.015, 0.005]];
        for (const [F, pts, dT, sT, dR, sR, dS, sS] of levels) {
            const b0 = { ...best }; let lv = { score: -1 };
            for (let rot = b0.rot - dR; rot <= b0.rot + dR + 1e-9; rot += sR)
                for (let sc = b0.scale - dS; sc <= b0.scale + dS + 1e-9; sc += sS)
                    for (let ty = b0.ty - dT; ty <= b0.ty + dT; ty += sT) for (let tx = b0.tx - dT; tx <= b0.tx + dT; tx += sT) {
                        const s = score(RP[F], pts, tx / F, ty / F, rot, sc);
                        if (s > lv.score) lv = { tx, ty, rot: +rot.toFixed(2), scale: +sc.toFixed(3), score: s };
                    }
            best = lv;
        }
        best.score = +best.score.toFixed(3);
        return best;
    }

    /** 이중선형 보간으로 src를 행렬 M(로컬 → 대상)으로 dst 위에 덮어 그린다(알파 합성) */
    function drawAffine(dst, dw, dh, src, sw, sh, M, ox = 0, oy = 0) {
        const [a, b, c, d, e, f] = M, det = a * d - b * c, ia = d / det, ib = -b / det, ic = -c / det, id = a / det;
        const ie = -(ia * e + ic * f), iff = -(ib * e + id * f);
        // 대상에서 그려질 범위
        const cs = [[0, 0], [sw, 0], [0, sh], [sw, sh]].map(([x, y]) => [a * x + c * y + e + ox, b * x + d * y + f + oy]);
        const x0 = Math.max(0, Math.floor(Math.min(...cs.map(p => p[0])))), x1 = Math.min(dw - 1, Math.ceil(Math.max(...cs.map(p => p[0]))));
        const y0 = Math.max(0, Math.floor(Math.min(...cs.map(p => p[1])))), y1 = Math.min(dh - 1, Math.ceil(Math.max(...cs.map(p => p[1]))));
        const S = (x, y, k) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : src[(y * sw + x) * 4 + k];
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            const wx = x + 0.5 - ox, wy = y + 0.5 - oy;
            const u = ia * wx + ic * wy + ie - 0.5, v = ib * wx + id * wy + iff - 0.5;
            if (u < -1 || v < -1 || u > sw || v > sh) continue;
            const ux = Math.floor(u), vy = Math.floor(v), fx = u - ux, fy = v - vy;
            // 알파 가중(프리멀티플라이) 보간
            let A = 0, R = 0, G = 0, B = 0;
            for (const [px, py, wgt] of [[ux, vy, (1 - fx) * (1 - fy)], [ux + 1, vy, fx * (1 - fy)], [ux, vy + 1, (1 - fx) * fy], [ux + 1, vy + 1, fx * fy]]) {
                const al = S(px, py, 3) * wgt; A += al; R += S(px, py, 0) * al; G += S(px, py, 1) * al; B += S(px, py, 2) * al;
            }
            if (A <= 0.5) continue;
            const sa = A / 255, o = (y * dw + x) * 4, da = dst[o + 3] / 255, oa = sa + da * (1 - sa);
            dst[o] = (R / A * sa + dst[o] * da * (1 - sa)) / oa; dst[o + 1] = (G / A * sa + dst[o + 1] * da * (1 - sa)) / oa;
            dst[o + 2] = (B / A * sa + dst[o + 2] * da * (1 - sa)) / oa; dst[o + 3] = oa * 255;
        }
    }

    /**
     * 소프트 알파 키잉(R02 A-24 ②): 크로마키 배경 그림을 투명 배경으로. 배경 쪽으로 치우친 정도로 알파를 정하고
     * 배경색을 빼낸 원래 색을 추정한다(C = aF + (1-a)K). 테두리 밖 픽셀은 완전 투명.
     */
    function chromaKey(rgba, w, h) {
        // 배경 종류: 테두리 픽셀 다수결
        let gr = 0, mg = 0;
        for (let x = 0; x < w; x++) for (const y of [0, h - 1]) { const i = (y * w + x) * 4; if (rgba[i + 1] > 150 && rgba[i] < 120 && rgba[i + 2] < 120) gr++; if (rgba[i] > 200 && rgba[i + 2] > 200 && rgba[i + 1] < 80) mg++; }
        const magenta = mg > gr, out = new Uint8ClampedArray(w * h * 4);
        for (let i = 0; i < w * h; i++) {
            const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
            if (rgba[i * 4 + 3] < 20) continue;
            const ex = magenta ? Math.min(r, b) - g : g - Math.max(r, b);
            let a = ex <= 8 ? 1 : Math.max(0, Math.min(1, 1 - ex / 255));
            if (a < 0.06) continue;
            let fr = r, fg = g, fb = b;
            if (a < 1) {
                if (magenta) { fr = (r - (1 - a) * 255) / a; fg = g / a; fb = (b - (1 - a) * 255) / a; }
                else { fr = r / a; fg = (g - (1 - a) * 255) / a; fb = b / a; fg = Math.min(fg, Math.max(fr, fb)); }
            }
            out[i * 4] = fr; out[i * 4 + 1] = fg; out[i * 4 + 2] = fb; out[i * 4 + 3] = Math.round(a * 255);
        }
        return { rgba: out, magenta };
    }

    const api = { SLOTS, SHEET_ORDER, readingOrder, slotsByOrder, priorCenter, partMatrix, bgMask, downsample, pyramid, partPoints, score, autoFit, drawAffine, chromaKey };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.FitCore = api;
})(typeof window !== 'undefined' ? window : this);
