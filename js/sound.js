/**
 * 효과음 모듈 (js/sound.js) - v0.53.6, 워크플로 P6-1
 * - 외부 음원 없이 Web Audio API로 합성한다.
 * - 브라우저 자동 재생 정책 때문에 첫 클릭/키 입력 이후에 오디오가 켜진다. 그 전의 playSfx 호출은 무시된다.
 * - 설정은 USER_DATA.settings { sfxMuted, sfxVolume(0~1) }에 저장한다.
 * - 잦은 소리(발사, 처치)는 실제 시간 기준으로 간격을 제한해 배속에서도 소리가 뭉개지지 않게 한다.
 */

let sfxCtx = null;
let sfxMaster = null;
let sfxNoiseBuffer = null;
const sfxLastPlayed = {};

// 같은 효과음의 최소 재생 간격(ms)
const SFX_THROTTLE_MS = { shoot: 70, kill: 45, leak: 120, build: 40 };

function initSfxContext() {
    if (sfxCtx) {
        if (sfxCtx.state === 'suspended') sfxCtx.resume();
        return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    sfxCtx = new Ctx();
    sfxMaster = sfxCtx.createGain();
    sfxMaster.connect(sfxCtx.destination);
    applySfxVolume();

    // 폭발/타격용 백색 소음 버퍼 (0.5초)
    const len = Math.floor(sfxCtx.sampleRate * 0.5);
    sfxNoiseBuffer = sfxCtx.createBuffer(1, len, sfxCtx.sampleRate);
    const data = sfxNoiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
}
window.addEventListener('pointerdown', initSfxContext, true);
window.addEventListener('keydown', initSfxContext, true);

function getSfxSettings() {
    if (!USER_DATA.settings) USER_DATA.settings = { sfxMuted: false, sfxVolume: 0.5 };
    return USER_DATA.settings;
}

function applySfxVolume() {
    if (!sfxMaster) return;
    const s = getSfxSettings();
    sfxMaster.gain.value = s.sfxMuted ? 0 : Math.max(0, Math.min(1, s.sfxVolume));
}

// ---------- 합성 도구 ----------
function sfxTone(freq, dur, opts = {}) {
    const { type = 'sine', vol = 0.2, slideTo = null, delay = 0 } = opts;
    const t = sfxCtx.currentTime + delay;
    const osc = sfxCtx.createOscillator();
    const gain = sfxCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(sfxMaster);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

function sfxNoise(dur, opts = {}) {
    const { vol = 0.2, filterFreq = 1200, delay = 0 } = opts;
    const t = sfxCtx.currentTime + delay;
    const src = sfxCtx.createBufferSource();
    src.buffer = sfxNoiseBuffer;
    const filter = sfxCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    const gain = sfxCtx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxMaster);
    src.start(t);
    src.stop(t + dur + 0.02);
}

function sfxArpeggio(freqs, step, opts = {}) {
    freqs.forEach((f, i) => sfxTone(f, opts.dur || 0.18, { ...opts, delay: (opts.delay || 0) + i * step }));
}

// ---------- 효과음 정의 ----------
const SFX_RECIPES = {
    // 타워 발사 (타워 종류별)
    shoot(towerKey) {
        switch (towerKey) {
            case 'sniper': sfxTone(1400, 0.12, { type: 'square', vol: 0.04, slideTo: 300 }); break;
            case 'bomb': sfxNoise(0.18, { vol: 0.12, filterFreq: 500 }); break;
            case 'ice': sfxTone(1200, 0.08, { vol: 0.05, slideTo: 1700 }); break;
            case 'shock': sfxTone(300, 0.06, { type: 'sawtooth', vol: 0.035, slideTo: 1200 }); break;
            case 'melee': sfxNoise(0.04, { vol: 0.06, filterFreq: 2500 }); break;
            default: sfxTone(880, 0.05, { type: 'triangle', vol: 0.045, slideTo: 660 });
        }
    },
    kill() { sfxTone(520, 0.08, { type: 'square', vol: 0.04, slideTo: 260 }); },
    leak() { sfxTone(200, 0.25, { type: 'sawtooth', vol: 0.12, slideTo: 110 }); },
    boss() {
        sfxTone(110, 0.6, { type: 'sawtooth', vol: 0.14 });
        sfxTone(82, 0.7, { type: 'sawtooth', vol: 0.12, delay: 0.12 });
    },
    waveClear() { sfxArpeggio([523, 659, 784], 0.08, { vol: 0.1 }); },
    build() {
        sfxTone(300, 0.07, { type: 'square', vol: 0.05, slideTo: 200 });
        sfxNoise(0.05, { vol: 0.05, filterFreq: 1800 });
    },
    tower() { sfxTone(440, 0.12, { type: 'triangle', vol: 0.1, slideTo: 660 }); },
    upgrade() { sfxArpeggio([660, 990], 0.06, { type: 'triangle', vol: 0.09, dur: 0.1 }); },
    spell() {
        sfxTone(300, 0.35, { vol: 0.1, slideTo: 1200 });
        sfxNoise(0.3, { vol: 0.05, filterFreq: 3000 });
    },
    // 소환 봉인 개방 (등급별로 화려해진다)
    summon(grade) {
        const g = grade || 'C';
        if (g === 'UR' || g === 'U') {
            sfxArpeggio([523, 659, 784, 1047, 1319, 1568], 0.07, { vol: 0.1, dur: 0.3 });
            sfxNoise(0.6, { vol: 0.04, filterFreq: 6000, delay: 0.3 });
        } else if (g === 'SR') {
            sfxArpeggio([523, 659, 784, 1047], 0.08, { vol: 0.1, dur: 0.25 });
        } else if (g === 'R') {
            sfxArpeggio([523, 659, 988], 0.09, { vol: 0.09 });
        } else {
            sfxArpeggio([523, 784], 0.1, { vol: 0.08 });
        }
    },
    victory() { sfxArpeggio([523, 659, 784, 1047], 0.14, { vol: 0.12, dur: 0.35 }); },
    gameOver() { sfxArpeggio([392, 330, 262, 196], 0.18, { type: 'sawtooth', vol: 0.08, dur: 0.35 }); }
};

/**
 * 효과음 재생. 오디오가 아직 켜지지 않았거나 음소거면 아무것도 하지 않는다.
 * @param {string} name SFX_RECIPES 키
 * @param {*} [arg] 효과음별 인자 (shoot: 타워 키, summon: 등급)
 */
function playSfx(name, arg) {
    if (!sfxCtx || sfxCtx.state !== 'running') return;
    if (getSfxSettings().sfxMuted) return;
    const gap = SFX_THROTTLE_MS[name] || 0;
    if (gap) {
        const now = performance.now();
        if (now - (sfxLastPlayed[name] || 0) < gap) return;
        sfxLastPlayed[name] = now;
    }
    const recipe = SFX_RECIPES[name];
    if (!recipe) return;
    try {
        recipe(arg);
    } catch (e) {
        console.error('효과음 재생 실패', name, e);
    }
}

// ---------- 설정 UI (화면 오른쪽 아래 고정) ----------
function toggleSfxMute() {
    initSfxContext();
    const s = getSfxSettings();
    s.sfxMuted = !s.sfxMuted;
    applySfxVolume();
    saveData();
    updateSfxToggleUI();
    if (!s.sfxMuted) playSfx('tower');
}

function setSfxVolume(percent) {
    const s = getSfxSettings();
    s.sfxVolume = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
    if (s.sfxVolume > 0) s.sfxMuted = false;
    applySfxVolume();
    saveData();
    updateSfxToggleUI();
}

function updateSfxToggleUI() {
    const s = getSfxSettings();
    const btn = document.getElementById('sfx-toggle-btn');
    const slider = document.getElementById('sfx-volume-slider');
    if (btn) {
        btn.textContent = s.sfxMuted ? '🔇' : '🔊';
        btn.title = s.sfxMuted ? '효과음 켜기' : '효과음 끄기';
    }
    if (slider) slider.value = Math.round(s.sfxVolume * 100);
}
