/*
 * DOM 리그 런타임 시제품 (v0.55.23, 회의 안건 A-01, A-05, A-06)
 *
 * - 파츠는 모두 한 컨테이너 안의 형제 div다(평면 구조). 겹침은 z-index, 관절 상속은 JS가 계산한 누적 행렬로 처리한다.
 *   중첩 div로 만들면 z-index가 부모 쌓임 맥락에 갇혀 칼(c13)처럼 계층과 겹침이 엇갈리는 파츠를 그릴 수 없다.
 * - 각 div는 아틀라스 한 장을 배경으로 쓰고 background-position으로 자기 영역만 보인다.
 * - 애니메이션은 Web Animations API(Element.animate)로 재생한다. requestAnimationFrame 루프는 쓰지 않는다.
 *   모션 함수(poseAt)를 일정 간격으로 샘플링해 레이어별 matrix() 키프레임을 만든다.
 * - 굽기 도구(test/tools/bake_strips.mjs)는 같은 poseAt으로 정지 자세를 직접 그린다(renderStatic).
 *
 * 게임 연동 전 시제품이라 test/ 밖에서 쓰지 않는다. 전역 이름은 TDRig 하나만 만든다.
 */
(function () {
    'use strict';

    // ---------- 모션 정의 ----------
    // test/body_parts_viewer.html의 setAnimMode 모션을 옮긴 것이다. t는 초.
    // cycle은 한 바퀴 길이(초). 대기는 호흡 2번(약 2.51초 x 2)에 깜빡임 1번이 맞도록 5.03초로 잡았다.
    const MOTIONS = {
        idle: {
            label: '대기', cycle: (2 * Math.PI / 2.5) * 2,
            pose(t) {
                const s = Math.sin(t * 2.5);
                return {
                    rootY: s * 3,
                    rot: { b03: 0, b02: s * 1, b01: Math.sin(t * 2.5 - 0.5) * 4, b04: s * 5, b05: Math.sin(t * 2.5 - 0.4) * 6 - 5, b06: -s * 5, b07: -Math.sin(t * 2.5 - 0.4) * 6 - 5, b08: 0, b09: 0 },
                    sy: { b02: 1 + s * 0.015 },
                    face: (t % this.cycle) < 0.16 ? 'blink' : 'neutral',
                };
            },
        },
        walk: {
            label: '이동', cycle: 2 * Math.PI / 6.5,
            pose(t) {
                const w = t * 6.5;
                return {
                    rootY: Math.abs(Math.sin(w)) * -10,
                    rot: { b03: Math.sin(w) * 3, b02: 4 + Math.sin(w * 2) * 2, b01: -2 + Math.sin(w * 2) * 3, b08: Math.sin(w) * 24, b09: -Math.sin(w) * 24, b04: -Math.sin(w) * 22, b05: -15 - Math.max(0, Math.sin(w)) * 18, b06: Math.sin(w) * 22, b07: -15 - Math.max(0, -Math.sin(w)) * 18 },
                    sy: {}, face: 'neutral',
                };
            },
        },
        attack: {
            label: '공격', cycle: 1 / 1.3,
            pose(t) {
                const cyc = (t * 1.3) % 1.0;
                let sw;
                if (cyc < 0.35) sw = -(cyc / 0.35);
                else if (cyc < 0.58) sw = -1 + ((cyc - 0.35) / 0.23) * 2.2;
                else sw = 1.2 * (1 - (cyc - 0.58) / 0.42);
                return {
                    rootY: sw > 0 ? sw * 6 : 0,
                    rot: { b03: sw * 5, b02: sw * 12, b01: -sw * 6, b04: sw < 0 ? sw * 35 : sw * 30, b05: sw < 0 ? sw * 30 : -10 + sw * 18, b06: -sw * 18, b07: -20, b08: -sw * 10, b09: sw * 12 },
                    sy: {}, face: (cyc >= 0.30 && cyc <= 0.65) ? 'attack' : 'neutral',
                };
            },
        },
        hit: {
            label: '피격', cycle: 1 / 1.8,
            pose(t) {
                const cyc = (t * 1.8) % 1.0;
                const k = cyc < 0.2 ? cyc / 0.2 : Math.max(0, 1 - (cyc - 0.2) / 0.8);
                return {
                    rootY: k * 5,
                    rot: { b03: -k * 7, b02: -k * 10, b01: -k * 10, b04: -k * 28, b05: -k * 35, b06: k * 25, b07: -k * 40, b08: k * 12, b09: -k * 8 },
                    sy: {}, face: k > 0.3 ? 'attack' : 'neutral',
                };
            },
        },
    };

    // ---------- 2D 행렬 [a, b, c, d, e, f] ----------
    const mul = (m, n) => [
        m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
        m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
        m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
    ];
    const T = (x, y) => [1, 0, 0, 1, x, y];
    const R = deg => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; };
    const S = (sx, sy) => [sx, 0, 0, sy, 0, 0];
    const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const css = m => `matrix(${m.map(v => +v.toFixed(5)).join(',')})`;

    // ---------- 데이터 읽기 ----------
    async function load(charRigUrl) {
        const rig = await (await fetch(charRigUrl)).json();
        const bodyUrl = new URL(rig.body, new URL(charRigUrl, location.href)).href;
        const body = await (await fetch(bodyUrl)).json();
        const base = u => new URL('.', u).href;
        const bones = {};
        body.bones.forEach(b => { bones[b.id] = b; });
        const layers = [
            ...body.layers.map(l => ({ ...l, atlas: base(bodyUrl) + body.atlas.webp, atlasW: body.atlas.w, atlasH: body.atlas.h })),
            ...rig.layers.map(l => ({ ...l, atlas: base(new URL(charRigUrl, location.href).href) + rig.atlas.webp, atlasW: rig.atlas.w, atlasH: rig.atlas.h })),
        ].sort((a, b) => a.z - b.z);
        return { rig, body, bones, layers, faces: rig.faces, canvas: rig.canvas };
    }

    /** 뼈 체인(루트 → 자신) */
    function chainOf(model, boneId) {
        const out = [];
        for (let b = model.bones[boneId]; b; b = b.parent ? model.bones[b.parent] : null) out.unshift(b);
        return out;
    }

    /** 자세에서 뼈의 누적 행렬(정지 자세 좌표계 기준). 뷰어 applyChainTransform과 같은 순서. */
    function boneMatrix(model, pose, boneId) {
        let m = T(0, pose.rootY || 0);
        for (const b of chainOf(model, boneId)) {
            let r = pose.rot[b.id] || 0;
            r = Math.max(b.minRot, Math.min(b.maxRot, r)); // 뷰어의 가동범위 제한과 동일
            const sy = (pose.sy && pose.sy[b.id]) || 1;
            const [px, py] = b.pivot;
            m = mul(m, mul(T(px, py), mul(R(r), mul(S(1, sy), T(-px, -py)))));
        }
        return m;
    }
    const layerMatrix = (model, pose, layer) => mul(boneMatrix(model, pose, layer.bone), T(layer.x, layer.y));

    function faceVisible(model, layer, face) {
        if (layer.kind !== 'face') return true;
        return model.faces[face || 'neutral'] === layer.id;
    }

    // ---------- DOM ----------
    function build(model, container) {
        container.style.position = 'relative';
        const els = {};
        for (const l of model.layers) {
            const d = document.createElement('div');
            d.className = 'rig-layer';
            d.dataset.id = l.id;
            Object.assign(d.style, {
                position: 'absolute', left: '0', top: '0', width: l.w + 'px', height: l.h + 'px',
                backgroundImage: `url("${l.atlas}")`, backgroundPosition: `-${l.ax}px -${l.ay}px`,
                backgroundSize: `${l.atlasW}px ${l.atlasH}px`, transformOrigin: '0 0', zIndex: String(l.z), willChange: 'transform',
            });
            container.appendChild(d);
            els[l.id] = d;
        }
        return els;
    }

    function renderStatic(model, els, motion, t) {
        const pose = MOTIONS[motion].pose(t);
        for (const l of model.layers) {
            els[l.id].style.transform = css(layerMatrix(model, pose, l));
            els[l.id].style.opacity = faceVisible(model, l, pose.face) ? '1' : '0';
        }
    }

    /**
     * WAAPI 애니메이션 생성. keysPerCycle: 한 바퀴의 키프레임 수(촘촘할수록 관절 벌어짐이 줄어든다).
     * 표정은 opacity 키프레임에 step-end 이징을 걸어 중간값 없이 바뀐다.
     */
    function animate(model, els, motion, keysPerCycle) {
        const M = MOTIONS[motion];
        const n = Math.max(2, keysPerCycle);
        const poses = [];
        for (let i = 0; i <= n; i++) poses.push(M.pose((i / n) * M.cycle));
        const anims = [];
        for (const l of model.layers) {
            const kf = poses.map((p, i) => ({ offset: i / n, transform: css(layerMatrix(model, p, l)), opacity: faceVisible(model, l, p.face) ? 1 : 0, easing: 'linear' }));
            if (l.kind === 'face') kf.forEach(k => { k.easing = 'step-end'; });
            els[l.id].style.transform = '';
            els[l.id].style.opacity = '';
            anims.push(els[l.id].animate(kf, { duration: M.cycle * 1000, iterations: Infinity }));
        }
        return anims;
    }

    /**
     * 관절 벌어짐 측정. 재생 중인 애니메이션을 여러 시점으로 옮겨 실제 계산된 transform을 읽고,
     * 자식 뼈 피벗이 부모 레이어 행렬과 자식 레이어 행렬에서 각각 어디로 가는지 비교한다(정확한 FK면 0).
     */
    function measureJointGap(model, els, anims, samples = 240) {
        const dur = anims[0].effect.getTiming().duration;
        const toArr = s => { const m = new DOMMatrixReadOnly(s); return [m.a, m.b, m.c, m.d, m.e, m.f]; };
        const layerOfBone = {};
        model.layers.forEach(l => { if (l.kind === 'body') layerOfBone[l.bone] = l; });
        anims.forEach(a => a.pause());
        let max = 0, sum = 0, cnt = 0, worst = null;
        for (let i = 0; i < samples; i++) {
            const t = (i + 0.5) / samples * dur;
            anims.forEach(a => { a.currentTime = t; });
            for (const b of Object.values(model.bones)) {
                if (!b.parent) continue;
                const cl = layerOfBone[b.id], pl = layerOfBone[b.parent];
                const cm = mul(toArr(getComputedStyle(els[cl.id]).transform), T(-cl.x, -cl.y));
                const pm = mul(toArr(getComputedStyle(els[pl.id]).transform), T(-pl.x, -pl.y));
                const [x1, y1] = apply(cm, b.pivot[0], b.pivot[1]);
                const [x2, y2] = apply(pm, b.pivot[0], b.pivot[1]);
                const g = Math.hypot(x1 - x2, y1 - y2);
                sum += g; cnt++;
                if (g > max) { max = g; worst = { bone: b.id, timeMs: Math.round(t) }; }
            }
        }
        anims.forEach(a => a.play());
        return { maxPx: +max.toFixed(2), meanPx: +(sum / cnt).toFixed(3), worst };
    }

    window.TDRig = { MOTIONS, load, build, renderStatic, animate, measureJointGap, boneMatrix, layerMatrix };
})();
