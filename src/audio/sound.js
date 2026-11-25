'use strict';

// =========================================================================
// [BLOCK:FX_AND_SOUND]
// 15. ВИЗУАЛЬНЫЕ ФИЛЬТРЫ 3D-СЦЕНЫ (v21): ПОСТОЯННЫЙ СТИЛЬ «НАТУРАЛЬНЫЙ»
// =========================================================================
function applyPermanentNaturalFilter() {
    try { localStorage.removeItem('sakhalin_visual_filter'); } catch (_) {}
    if (renderer) {
        renderer.toneMappingExposure = 1.12;
        if (renderer.domElement) {
            renderer.domElement.classList.remove('vfx-pixelated');
            renderer.domElement.style.filter = 'contrast(1.11) saturate(1.16) brightness(1.04) sepia(0.06)';
        }
    }
}

// =========================================================================
// 16. ПРОЦЕДУРНЫЙ САУНД-ДИЗАЙН (v29, WEB AUDIO API):
//     - Звук включён по умолчанию со старта (авторазблокировка по первому жесту)
//     - Космический эмбиент на 3D-планете + шипящий влёт сквозь облака
//     - Лето + День: тёплый морской бриз, накаты прибоя, далёкие чайки
//     - Лето + Ночь: тихий ночной океан + мягкий ночной эмбиент
//     - Зима + День: морозная позёмка, хрустящий арктический ветер, треск льда
//     - Зима + Ночь: вьюга + глубокий тёмный арктический эмбиент (dark ambient)
//     - Клики по станциям/судам, судовой тифон и шум двигателей вблизи кораблей
// =========================================================================
const soundV25 = {
    initialized: false,
    ctx: null,
    masterGain: null,
    noiseBuffer: null,
    enabled: true,
    // Слои эмбиента
    spaceGain: null,
    summerGain: null,
    winterWindGain: null,
    winterWindFilter: null,
    darkAmbientGain: null,
    darkAmbientFilter: null,
    wavesGain: null,
    wavesFilter: null,
    engineGain: null,
    engineOsc1: null,
    engineOsc2: null,
    seagullTimer: 2.8,
    iceCrackTimer: 3.6,
    lastClickTime: 0
};

function createPinkNoiseBuffer(ctx, durationSec) {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.048;
        b6 = white * 0.115926;
    }
    return buffer;
}

function ensureSoundV25Graph() {
    if (soundV25.ctx) {
        if (soundV25.ctx.state === 'suspended') {
            soundV25.ctx.resume().catch(() => {});
        }
        return true;
    }
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        const ctx = new AC();
        soundV25.ctx = ctx;

        const master = ctx.createGain();
        master.gain.value = 0.0;
        master.connect(ctx.destination);
        soundV25.masterGain = master;

        const noiseBuf = createPinkNoiseBuffer(ctx, 4.0);
        soundV25.noiseBuffer = noiseBuf;

        // 1) Космический эмбиент (3D-планета — мягкий глубокий пэд на чистых синусоидах)
        const spaceGain = ctx.createGain();
        spaceGain.gain.value = 0.0;
        spaceGain.connect(master);
        soundV25.spaceGain = spaceGain;

        const spaceFilter = ctx.createBiquadFilter();
        spaceFilter.type = 'lowpass';
        spaceFilter.frequency.value = 210;
        spaceFilter.connect(spaceGain);

        const spOsc1 = ctx.createOscillator();
        spOsc1.type = 'sine';
        spOsc1.frequency.value = 65.41; // C2
        const spOsc2 = ctx.createOscillator();
        spOsc2.type = 'sine';
        spOsc2.frequency.value = 98.00; // G2
        const spOsc3 = ctx.createOscillator();
        spOsc3.type = 'triangle';
        spOsc3.frequency.value = 146.83; // D3

        const g1 = ctx.createGain(); g1.gain.value = 0.14;
        const g2 = ctx.createGain(); g2.gain.value = 0.07;
        const g3 = ctx.createGain(); g3.gain.value = 0.025;
        spOsc1.connect(g1); g1.connect(spaceFilter);
        spOsc2.connect(g2); g2.connect(spaceFilter);
        spOsc3.connect(g3); g3.connect(spaceFilter);
        spOsc1.start(); spOsc2.start(); spOsc3.start();

        const spAir = ctx.createBufferSource();
        spAir.buffer = noiseBuf;
        spAir.loop = true;
        const spAirFilter = ctx.createBiquadFilter();
        spAirFilter.type = 'bandpass';
        spAirFilter.frequency.value = 480;
        spAirFilter.Q.value = 1.6;
        const spAirGain = ctx.createGain();
        spAirGain.gain.value = 0.055;
        spAir.connect(spAirFilter);
        spAirFilter.connect(spAirGain);
        spAirGain.connect(spaceGain);
        spAir.start();

        // 2) Летний мягкий ветерок (чистая природа без низкочастотного гула)
        const summerGain = ctx.createGain();
        summerGain.gain.value = 0.0;
        summerGain.connect(master);
        soundV25.summerGain = summerGain;

        const breezeSrc = ctx.createBufferSource();
        breezeSrc.buffer = noiseBuf;
        breezeSrc.loop = true;
        const breezeFilter = ctx.createBiquadFilter();
        breezeFilter.type = 'bandpass';
        breezeFilter.frequency.value = 340;
        breezeFilter.Q.value = 0.85;
        breezeSrc.connect(breezeFilter);
        breezeFilter.connect(summerGain);
        breezeSrc.start();

        // 3) Зимний морозный ветер и мягкая арктическая позёмка (чистый воздух без низкого гула!)
        const winterWindGain = ctx.createGain();
        winterWindGain.gain.value = 0.0;
        winterWindGain.connect(master);
        soundV25.winterWindGain = winterWindGain;

        const wLowSrc = ctx.createBufferSource();
        wLowSrc.buffer = noiseBuf;
        wLowSrc.loop = true;
        const wLowFilter = ctx.createBiquadFilter();
        wLowFilter.type = 'bandpass';
        wLowFilter.frequency.value = 260;
        wLowFilter.Q.value = 1.05;
        soundV25.winterWindFilter = wLowFilter;
        const wLowG = ctx.createGain();
        wLowG.gain.value = 0.78;
        wLowSrc.connect(wLowFilter);
        wLowFilter.connect(wLowG);
        wLowG.connect(winterWindGain);
        wLowSrc.start();

        // Мягкий морозный шёпот позёмки
        const wHowlSrc = ctx.createBufferSource();
        wHowlSrc.buffer = noiseBuf;
        wHowlSrc.loop = true;
        const wHowlFilter = ctx.createBiquadFilter();
        wHowlFilter.type = 'bandpass';
        wHowlFilter.frequency.value = 620;
        wHowlFilter.Q.value = 1.75;
        const wHowlG = ctx.createGain();
        wHowlG.gain.value = 0.24;
        wHowlSrc.connect(wHowlFilter);
        wHowlFilter.connect(wHowlG);
        wHowlG.connect(winterWindGain);
        wHowlSrc.start();

        // 4) Бархатный ночной эмбиент (чистые синусы и мягкий треугольник — без резкого sawtooth!)
        const darkAmbientGain = ctx.createGain();
        darkAmbientGain.gain.value = 0.0;
        darkAmbientGain.connect(master);
        soundV25.darkAmbientGain = darkAmbientGain;

        const darkFilter = ctx.createBiquadFilter();
        darkFilter.type = 'lowpass';
        darkFilter.frequency.value = 185;
        darkFilter.Q.value = 0.9;
        darkFilter.connect(darkAmbientGain);
        soundV25.darkAmbientFilter = darkFilter;

        // Спокойный глубокий ночной sub-drone (D1, A1, E2, F2 — мягко и благородно)
        const darkNotes = [
            { type: 'sine',     freq: 43.65, vol: 0.14 },
            { type: 'sine',     freq: 65.41, vol: 0.10 },
            { type: 'triangle', freq: 98.00, vol: 0.04 },
            { type: 'sine',     freq: 110.00, vol: 0.03 }
        ];
        darkNotes.forEach(n => {
            const osc = ctx.createOscillator();
            osc.type = n.type;
            osc.frequency.value = n.freq;
            const g = ctx.createGain();
            g.gain.value = n.vol;
            osc.connect(g);
            g.connect(darkFilter);
            osc.start();
        });

        // 5) Шум морского прибоя / волн (ТОЛЬКО летом; зимой полностью уходит в 0, не перебивая зимний ветер!)
        const wavesGain = ctx.createGain();
        wavesGain.gain.value = 0.0;
        wavesGain.connect(master);
        soundV25.wavesGain = wavesGain;

        const waveSrc = ctx.createBufferSource();
        waveSrc.buffer = noiseBuf;
        waveSrc.loop = true;
        const waveFilter = ctx.createBiquadFilter();
        waveFilter.type = 'lowpass';
        waveFilter.frequency.value = 380;
        waveFilter.Q.value = 0.65;
        soundV25.wavesFilter = waveFilter;
        waveSrc.connect(waveFilter);
        waveFilter.connect(wavesGain);
        waveSrc.start();

        // 6) Тихий мягкий гул судового двигателя вблизи кораблей (без резкой пилы)
        const engineGain = ctx.createGain();
        engineGain.gain.value = 0.0;
        engineGain.connect(master);
        soundV25.engineGain = engineGain;

        const engFilter = ctx.createBiquadFilter();
        engFilter.type = 'lowpass';
        engFilter.frequency.value = 165;
        engFilter.connect(engineGain);

        const eng1 = ctx.createOscillator();
        eng1.type = 'triangle';
        eng1.frequency.value = 58;
        const eng2 = ctx.createOscillator();
        eng2.type = 'sine';
        eng2.frequency.value = 116.4;
        const eg1 = ctx.createGain(); eg1.gain.value = 0.10;
        const eg2 = ctx.createGain(); eg2.gain.value = 0.06;
        eng1.connect(eg1); eg1.connect(engFilter);
        eng2.connect(eg2); eg2.connect(engFilter);
        eng1.start(); eng2.start();
        soundV25.engineOsc1 = eng1;
        soundV25.engineOsc2 = eng2;

        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        return true;
    } catch (_) {
        return false;
    }
}

function syncSoundV25Buttons() {
    soundV25.enabled = Boolean(isSoundEnabled);
    if (typeof syncAllSoundButtons === 'function') {
        syncAllSoundButtons();
    }
}

// Атмосферный шипящий звук влёта / всасывания сквозь облака
function playDiveWhooshSfx(isGoingToMap) {
    if (!isSoundEnabled || !ensureSoundV25Graph()) return;
    try {
        const ctx = soundV25.ctx;
        const now = ctx.currentTime;
        const dur = isGoingToMap ? 1.45 : 1.15;

        const src = ctx.createBufferSource();
        src.buffer = soundV25.noiseBuffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.65;
        bp.frequency.setValueAtTime(isGoingToMap ? 180 : 950, now);
        bp.frequency.exponentialRampToValueAtTime(isGoingToMap ? 1650 : 320, now + dur * 0.55);
        bp.frequency.exponentialRampToValueAtTime(isGoingToMap ? 260 : 120, now + dur);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.42, now + dur * 0.42);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);

        src.connect(bp);
        bp.connect(g);
        g.connect(soundV25.masterGain);
        src.start(now);
        src.stop(now + dur + 0.05);

        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(isGoingToMap ? 95 : 58, now);
        sub.frequency.exponentialRampToValueAtTime(isGoingToMap ? 42 : 110, now + dur * 0.85);
        const sg = ctx.createGain();
        sg.gain.setValueAtTime(0.001, now);
        sg.gain.linearRampToValueAtTime(0.16, now + dur * 0.35);
        sg.gain.exponentialRampToValueAtTime(0.001, now + dur);
        sub.connect(sg);
        sg.connect(soundV25.masterGain);
        sub.start(now);
        sub.stop(now + dur + 0.05);
    } catch (_) {}
}

// Далёкий естественный крик чайки в летнем дневном режиме
function playDistantSeagullSfx() {
    if (!isSoundEnabled || !soundV25.ctx) return;
    try {
        const ctx = soundV25.ctx;
        const now = ctx.currentTime;
        const calls = Math.random() > 0.45 ? 2 : 1;

        for (let c = 0; c < calls; c++) {
            const t0 = now + c * (0.28 + Math.random() * 0.09);
            const dur = 0.24 + Math.random() * 0.12;
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            const baseFreq = 1650 + Math.random() * 380;
            osc.frequency.setValueAtTime(baseFreq * 0.82, t0);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.14, t0 + dur * 0.28);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.68, t0 + dur);

            const bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 1850;
            bp.Q.value = 2.4;

            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0005, t0);
            g.gain.linearRampToValueAtTime(0.032, t0 + dur * 0.22);
            g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);

            osc.connect(bp);
            bp.connect(g);
            g.connect(soundV25.masterGain);
            osc.start(t0);
            osc.stop(t0 + dur + 0.03);
        }
    } catch (_) {}
}

// Глухой треск и сжатие морского льда в зимнем режиме
function playWinterIceCrackSfx() {
    if (!isSoundEnabled || !soundV25.ctx || !soundV25.noiseBuffer) return;
    try {
        const ctx = soundV25.ctx;
        const now = ctx.currentTime;

        const src = ctx.createBufferSource();
        src.buffer = soundV25.noiseBuffer;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(520 + Math.random() * 340, now);
        bp.frequency.exponentialRampToValueAtTime(140, now + 0.45);
        bp.Q.value = 3.5;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.11, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.48);

        src.connect(bp);
        bp.connect(g);
        g.connect(soundV25.masterGain);
        src.start(now);
        src.stop(now + 0.52);
    } catch (_) {}
}

// Характерный механический / гидравлический звук при клике на станцию, платформу или установку
function playMechanicalStationSfx() {
    if (!isSoundEnabled || !ensureSoundV25Graph()) return;
    const nowMs = performance.now();
    if (nowMs - soundV25.lastClickTime < 140) return;
    soundV25.lastClickTime = nowMs;

    try {
        const ctx = soundV25.ctx;
        const now = ctx.currentTime;

        const clickSrc = ctx.createBufferSource();
        clickSrc.buffer = soundV25.noiseBuffer;
        const hp = ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.value = 2400;
        hp.Q.value = 3.2;
        const cg = ctx.createGain();
        cg.gain.setValueAtTime(0.28, now);
        cg.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        clickSrc.connect(hp);
        hp.connect(cg);
        cg.connect(soundV25.masterGain);
        clickSrc.start(now);
        clickSrc.stop(now + 0.055);

        const thud = ctx.createOscillator();
        thud.type = 'triangle';
        thud.frequency.setValueAtTime(165, now);
        thud.frequency.exponentialRampToValueAtTime(54, now + 0.095);
        const tg = ctx.createGain();
        tg.gain.setValueAtTime(0.18, now);
        tg.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        thud.connect(tg);
        tg.connect(soundV25.masterGain);
        thud.start(now);
        thud.stop(now + 0.12);

        const beep = ctx.createOscillator();
        beep.type = 'sine';
        beep.frequency.setValueAtTime(880, now + 0.03);
        beep.frequency.setValueAtTime(1175, now + 0.07);
        const bg = ctx.createGain();
        bg.gain.setValueAtTime(0.001, now + 0.025);
        bg.gain.linearRampToValueAtTime(0.055, now + 0.035);
        bg.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        beep.connect(bg);
        bg.connect(soundV25.masterGain);
        beep.start(now + 0.025);
        beep.stop(now + 0.14);
    } catch (_) {}
}

// Морской звук при клике на судно, танкер или портовый причал
function playMarineVesselSfx() {
    if (!isSoundEnabled || !ensureSoundV25Graph()) return;
    const nowMs = performance.now();
    if (nowMs - soundV25.lastClickTime < 140) return;
    soundV25.lastClickTime = nowMs;

    try {
        const ctx = soundV25.ctx;
        const now = ctx.currentTime;

        const surf = ctx.createBufferSource();
        surf.buffer = soundV25.noiseBuffer;
        const lp = ctx.createBiquadFilter();
        lp.type = 'bandpass';
        lp.frequency.setValueAtTime(420, now);
        lp.frequency.exponentialRampToValueAtTime(780, now + 0.25);
        lp.frequency.exponentialRampToValueAtTime(280, now + 0.65);
        const wg = ctx.createGain();
        wg.gain.setValueAtTime(0.001, now);
        wg.gain.linearRampToValueAtTime(0.24, now + 0.16);
        wg.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
        surf.connect(lp);
        lp.connect(wg);
        wg.connect(soundV25.masterGain);
        surf.start(now);
        surf.stop(now + 0.72);

        const horn = ctx.createOscillator();
        horn.type = 'sawtooth';
        horn.frequency.setValueAtTime(118, now + 0.04);
        const hlp = ctx.createBiquadFilter();
        hlp.type = 'lowpass';
        hlp.frequency.value = 340;
        const hg = ctx.createGain();
        hg.gain.setValueAtTime(0.001, now + 0.04);
        hg.gain.linearRampToValueAtTime(0.095, now + 0.11);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        horn.connect(hlp);
        hlp.connect(hg);
        hg.connect(soundV25.masterGain);
        horn.start(now + 0.04);
        horn.stop(now + 0.45);
    } catch (_) {}
}

function initSoundDesignV25() {
    if (soundV25.initialized) return;
    soundV25.initialized = true;

    // Включаем звук по умолчанию при старте и сразу обновляем все иконки
    isSoundEnabled = true;
    soundV25.enabled = true;
    syncAllSoundButtons();
    ensureSoundV25Graph();

    // Авторазблокировка Web Audio API при первом любом касании/клике/клавише пользователя
    const unlockAudioOnce = () => {
        if (!isSoundEnabled) return;
        if (ensureSoundV25Graph() && soundV25.ctx && soundV25.ctx.state === 'suspended') {
            soundV25.ctx.resume().catch(() => {});
        }
        if (soundV25.ctx && soundV25.ctx.state === 'running') {
            window.removeEventListener('pointerdown', unlockAudioOnce, true);
            window.removeEventListener('keydown', unlockAudioOnce, true);
        }
    };
    window.addEventListener('pointerdown', unlockAudioOnce, true);
    window.addEventListener('keydown', unlockAudioOnce, true);

    // Кнопка звука на стартовом 3D-глобусе вызывает единый переключатель toggleSoundMode()
    const globeSoundBtn = document.getElementById('btn-globe-sound');
    if (globeSoundBtn) {
        globeSoundBtn.addEventListener('click', e => {
            e.stopPropagation();
            toggleSoundMode();
        });
    }

    // Перехватываем влёт на карту и возврат на планету для шипящего звука атмосферы
    if (typeof enterMapFromGlobe === 'function') {
        const origEnter = enterMapFromGlobe;
        enterMapFromGlobe = function() {
            if (isSoundEnabled) playDiveWhooshSfx(true);
            origEnter();
        };
    }
    if (typeof openGlobeIntro === 'function') {
        const origOpen = openGlobeIntro;
        openGlobeIntro = function() {
            if (isSoundEnabled) playDiveWhooshSfx(false);
            origOpen();
        };
    }

    // Клики по меткам на карте и элементам списка объектов
    document.addEventListener('click', e => {
        if (!isSoundEnabled || isGlobeIntroActive) return;
        const target = e.target && e.target.closest ? e.target.closest('.marker-3d, [data-facility-id], #facility-list button, #facilities-list button') : null;
        if (!target) return;

        const txt = (target.textContent || '').toLowerCase();
        const isMarine = txt.includes('танкер') || txt.includes('газовоз') || txt.includes('ледокол') ||
                         txt.includes('паром') || txt.includes('причал') || txt.includes('порт') ||
                         txt.includes('тон') || txt.includes('де-кастри') || txt.includes('маяк');
        if (isMarine) {
            playMarineVesselSfx();
        } else {
            playMechanicalStationSfx();
        }
    }, true);
}

function updateSoundDesignV25(dt, elapsed) {
    soundV25.enabled = Boolean(isSoundEnabled);
    if (!soundV25.ctx || !soundV25.masterGain) return;

    const now = soundV25.ctx.currentTime;
    if (!isSoundEnabled) {
        soundV25.masterGain.gain.setTargetAtTime(0.0, now, 0.22);
        return;
    }
    if (soundV25.ctx.state === 'suspended') {
        soundV25.ctx.resume().catch(() => {});
    }

    // Общая громкость настроена до комфортных 70% (~0.60)
    soundV25.masterGain.gain.setTargetAtTime(0.60, now, 0.45);

    // 1. Космический эмбиент (активен на стартовой 3D-планете)
    const targetSpace = isGlobeIntroActive ? 0.48 : 0.0;
    soundV25.spaceGain.gain.setTargetAtTime(targetSpace, now, 0.85);

    const onMap = !isGlobeIntroActive;
    const nMix = typeof nightMix === 'number' ? nightMix : (isNightMode ? 1.0 : 0.0);

    // 2. Летний звуковой ландшафт (строго ТОЛЬКО летом — зимой полностью 0.0!)
    const isSummerMap = onMap && !isWinterMode;
    const breezeWave = 0.82 + Math.sin(elapsed * 0.28) * 0.18;
    const summerTarget = isSummerMap ? ((0.20 - nMix * 0.08) * breezeWave) : 0.0;
    soundV25.summerGain.gain.setTargetAtTime(summerTarget, now, 0.90);

    if (isSummerMap && nMix < 0.55) {
        soundV25.seagullTimer -= dt;
        if (soundV25.seagullTimer <= 0) {
            const camDist = (camera && controls) ? camera.position.distanceTo(controls.target) : 300;
            if (camDist < 340) {
                playDistantSeagullSfx();
            }
            soundV25.seagullTimer = 9.0 + Math.random() * 10.0;
        }
    }

    // 3. Зимний звуковой ландшафт (чистый морозный ветер, северный пэд и редкий треск льда — ничего летнего!)
    const isWinterMap = onMap && isWinterMode;
    const gust = 0.78 + 0.22 * Math.sin(elapsed * 0.34 + Math.sin(elapsed * 0.13) * 1.4);
    const winterTarget = isWinterMap ? ((0.30 + nMix * 0.06) * gust) : 0.0;
    if (soundV25.winterWindGain) {
        soundV25.winterWindGain.gain.setTargetAtTime(winterTarget, now, 0.90);
    }
    if (soundV25.winterWindFilter && isWinterMap) {
        soundV25.winterWindFilter.frequency.setTargetAtTime(195 + gust * 115, now, 0.65);
    }
    if (isWinterMap) {
        soundV25.iceCrackTimer -= dt;
        if (soundV25.iceCrackTimer <= 0) {
            playWinterIceCrackSfx();
            soundV25.iceCrackTimer = 7.5 + Math.random() * 9.5;
        }
    }

    // 4. Бархатный ночной эмбиент (плавный, без резких гармоник)
    let darkTarget = 0.0;
    let darkCutoff = 165;
    if (onMap && nMix > 0.02) {
        const pulse = 0.90 + 0.10 * Math.sin(elapsed * 0.24);
        if (isWinterMode) {
            darkTarget = nMix * 0.34 * pulse;
            darkCutoff = 215;
        } else {
            darkTarget = nMix * 0.20 * pulse;
            darkCutoff = 165;
        }
    }
    if (soundV25.darkAmbientGain) {
        soundV25.darkAmbientGain.gain.setTargetAtTime(darkTarget, now, 0.95);
    }
    if (soundV25.darkAmbientFilter) {
        soundV25.darkAmbientFilter.frequency.setTargetAtTime(darkCutoff, now, 0.95);
    }

    // 5. Шум океана и прибоя (ТОЛЬКО летом; зимой море сковано льдом -> waveVol = 0.0, чтобы лето не перекрывало зиму!)
    let waveVol = 0.0;
    let engineVol = 0.0;
    if (onMap && camera && controls) {
        const surfCycle = 0.68 + 0.32 * Math.sin(elapsed * 0.56);
        const camDist = camera.position.distanceTo(controls.target);

        if (!isWinterMode) {
            waveVol = (0.095 - nMix * 0.025) * surfCycle;
            if (camDist < 145) {
                const closeFactor = Math.max(0, Math.min(1, (145 - camDist) / 110));
                const tgtElev = getAnyLandElevation(controls.target.x, controls.target.z);
                if (tgtElev < 0.95) {
                    waveVol += closeFactor * 0.17 * surfCycle;
                }
            }
            if (soundV25.wavesFilter) {
                soundV25.wavesFilter.frequency.setTargetAtTime(320 + surfCycle * 190, now, 0.55);
            }
        }

        // Гул двигателей кораблей слышен ТОЛЬКО при реальном близком приближении к судну
        if (camDist < 44) {
            const shipZoomFactor = Math.max(0, Math.min(1, (44 - camDist) / 30));
            let minShipDist = 9999;
            if (typeof goldMaster !== 'undefined' && goldMaster.shipTrackers) {
                for (let i = 0; i < goldMaster.shipTrackers.length; i++) {
                    const sh = goldMaster.shipTrackers[i].ship;
                    if (!sh || !sh.visible || !sh.parent || !sh.parent.visible) continue;
                    const d = Math.hypot(sh.position.x - controls.target.x, sh.position.z - controls.target.z);
                    if (d < minShipDist) minShipDist = d;
                }
            }
            if (typeof tatarIce !== 'undefined' && tatarIce.icebreakerGroup && tatarIce.icebreakerGroup.visible) {
                const dIb = Math.hypot(tatarIce.icebreakerGroup.position.x - controls.target.x, tatarIce.icebreakerGroup.position.z - controls.target.z);
                if (dIb < minShipDist) minShipDist = dIb;
            }
            if (minShipDist < 18) {
                const shipProx = Math.max(0, 1.0 - minShipDist / 18);
                engineVol = shipZoomFactor * shipProx * 0.14;
            }
        }
    }

    soundV25.wavesGain.gain.setTargetAtTime(waveVol, now, 0.75);
    soundV25.engineGain.gain.setTargetAtTime(engineVol, now, 0.45);
}

