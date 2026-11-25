'use strict';

// =========================================================================
// [BLOCK:CINEMATIC_DIRECTOR_V3]
// ЕДИНЫЙ БЕЗШОВНЫЙ 3D-СИНЕМАТИК (Глобус -> единый сплайн-пролёт -> закрытие 3D-облаков)
// + 1 рендер/кадр, полный прогрев шейдеров, авторская киномузыка (без АП), запись HD
// =========================================================================
(function () {
    const TOTAL_DURATION = 90.0;

    const cin = {
        running: false,
        recording: false,
        paused: false,
        elapsed: 0,
        lastTs: 0,
        lang: 'ru',
        quality: '1080p',      // '1080p' | '720p'
        musicMode: 'builtin',  // 'builtin' | 'custom' | 'off'
        customAudioBuffer: null,
        customAudioSource: null,
        firedEvents: new Set(),

        // Единая сквозная сплайн-траектория (начинается из живой точки выхода из облаков — 0 скачков!)
        camPosCurve: null,
        camTgtCurve: null,
        mapSplineReady: false,
        mapEnterT: 6.95,
        curPos: new THREE.Vector3(0, 60, 80),
        curTarget: new THREE.Vector3(0, 0, 0),
        savedControlsEnabled: true,
        savedControlsDamping: true,

        // Кино-оверлей
        activeCard: null,
        activeChapter: null,
        clickRipple: null,
        titleOverlay: null,

        // Запись видео (однопроходный захват без двойного WebGL-рендера)
        recCanvas: null,
        recCtx: null,
        recorder: null,
        chunks: [],
        lastBlobUrl: null,
        lastFileName: 'Sakhalin_3D_Cinematic.webm',
        hookedMainRender: false,
        hookedGlobeRender: false,
        guardsInstalled: false,
        warmedUp: false,

        // Звук и встроенный саундтрек
        audioCtx: null,
        audioDest: null,
        musicMaster: null,
        worldConnected: false,
        musicTimerId: null,
        musicStep: 0,

        // Экранный canvas-оверлей
        viewCanvas: null,
        viewCtx: null
    };

    // =========================================================================
    // 1. ВСТРОЕННЫЙ КИНЕМАТОГРАФИЧНЫЙ САУНДТРЕК БЕЗ АВТОРСКИХ ПРАВ (Web Audio)
    //    Вдохновляющий эмбиент-пиано + тёплые струнные пэды (Dm9–Bbmaj7–Fadd9–C)
    // =========================================================================
    function ensureCinAudioGraph() {
        if (typeof ensureSoundV25Graph === 'function') {
            ensureSoundV25Graph();
        }
        if (typeof soundV25 !== 'undefined' && soundV25.ctx) {
            cin.audioCtx = soundV25.ctx;
        } else if (!cin.audioCtx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) cin.audioCtx = new AC();
        }
        if (!cin.audioCtx) return null;

        if (!cin.audioDest) {
            cin.audioDest = cin.audioCtx.createMediaStreamDestination();
        }
        if (!cin.musicMaster) {
            cin.musicMaster = cin.audioCtx.createGain();
            cin.musicMaster.gain.value = 0.0;
            cin.musicMaster.connect(cin.audioCtx.destination);
            cin.musicMaster.connect(cin.audioDest);
        }
        if (!cin.worldConnected && typeof soundV25 !== 'undefined' && soundV25.masterGain) {
            try {
                soundV25.masterGain.connect(cin.audioDest);
                cin.worldConnected = true;
            } catch (_) {}
        }
        if (cin.audioCtx.state === 'suspended') {
            cin.audioCtx.resume().catch(() => {});
        }
        return cin.audioCtx;
    }

    // Приглушаем звук мира до деликатного фона (~13%), не трогая саму основную карту
    function installWorldSoundDucker() {
        if (typeof updateSoundDesignV25 !== 'function' || updateSoundDesignV25._cinDucked) return;
        const origUpdate = updateSoundDesignV25;
        updateSoundDesignV25 = function (dt, elapsed) {
            origUpdate(dt, elapsed);
            if (typeof soundV25 !== 'undefined' && soundV25.ctx && soundV25.masterGain) {
                const now = soundV25.ctx.currentTime;
                const duckTarget = cin.running ? 0.13 : 0.0;
                soundV25.masterGain.gain.setTargetAtTime(duckTarget, now, 0.35);
            }
        };
        updateSoundDesignV25._cinDucked = true;
    }

    // Блокируем перехват камеры со стороны switchProjectTab / globe.js / clamp во время синематика
    function installCinematicCameraGuards() {
        if (cin.guardsInstalled) return;
        cin.guardsInstalled = true;

        if (typeof startCameraFly === 'function' && !startCameraFly._cinGuarded) {
            const origFly = startCameraFly;
            startCameraFly = function () {
                if (cin.running) {
                    if (typeof cameraTransition !== 'undefined') cameraTransition.active = false;
                    return;
                }
                return origFly.apply(this, arguments);
            };
            startCameraFly._cinGuarded = true;
        }

        if (typeof clampSakhalin1CameraTarget === 'function' && !clampSakhalin1CameraTarget._cinGuarded) {
            const origClamp = clampSakhalin1CameraTarget;
            clampSakhalin1CameraTarget = function () {
                if (cin.running) return;
                return origClamp.apply(this, arguments);
            };
            clampSakhalin1CameraTarget._cinGuarded = true;
        }
    }

    function stopCinematicMusic() {
        if (cin.musicTimerId) {
            clearInterval(cin.musicTimerId);
            cin.musicTimerId = null;
        }
        if (cin.customAudioSource) {
            try { cin.customAudioSource.stop(); } catch (_) {}
            cin.customAudioSource = null;
        }
        if (cin.audioCtx && cin.musicMaster) {
            const now = cin.audioCtx.currentTime;
            cin.musicMaster.gain.cancelScheduledValues(now);
            cin.musicMaster.gain.setTargetAtTime(0.0, now, 0.25);
        }
    }

    function startCinematicMusic() {
        stopCinematicMusic();
        if (cin.musicMode === 'off') return;
        const ctx = ensureCinAudioGraph();
        if (!ctx || !cin.musicMaster) return;

        const now = ctx.currentTime;
        cin.musicMaster.gain.cancelScheduledValues(now);
        cin.musicMaster.gain.setValueAtTime(0.0005, now);
        // Мягкий, ненавязчивый уровень громкости фона (0.32 вместо 0.68)
        cin.musicMaster.gain.linearRampToValueAtTime(0.32, now + 2.8);

        if (cin.musicMode === 'custom' && cin.customAudioBuffer) {
            const src = ctx.createBufferSource();
            src.buffer = cin.customAudioBuffer;
            src.loop = true;
            src.connect(cin.musicMaster);
            src.start(now);
            cin.customAudioSource = src;
            return;
        }

        // Спокойный, бархатный кинематографичный эмбиент без АП (стиль документального кино):
        // мягкие перетекающие струнные пэды + редкая певучая мелодия, без резких «пим-пим» и рваного эха
        const act1Bars = [
            { bass: 73.42, pad: [146.83, 220.00, 261.63, 329.63], mel: [[0.5, 440.00, 3.0]] },
            { bass: 58.27, pad: [116.54, 174.61, 220.00, 293.66], mel: [[0.6, 523.25, 2.8]] },
            { bass: 87.31, pad: [174.61, 220.00, 261.63, 349.23], mel: [[0.4, 587.33, 2.2], [2.4, 523.25, 2.2]] },
            { bass: 65.41, pad: [130.81, 196.00, 261.63, 329.63], mel: [[0.5, 493.88, 3.1]] }
        ];
        const act2Bars = [
            { bass: 87.31, pad: [174.61, 220.00, 261.63, 329.63], mel: [[0.3, 523.25, 2.1], [2.2, 587.33, 2.3]] },
            { bass: 82.41, pad: [164.81, 196.00, 261.63, 329.63], mel: [[0.4, 659.25, 2.6]] },
            { bass: 73.42, pad: [146.83, 220.00, 261.63, 349.23], mel: [[0.3, 587.33, 2.0], [2.1, 523.25, 2.4]] },
            { bass: 65.41, pad: [130.81, 196.00, 261.63, 329.63], mel: [[0.5, 440.00, 2.9]] }
        ];
        const act3Bars = [
            { bass: 73.42, pad: [146.83, 220.00, 293.66, 349.23], mel: [[0.3, 587.33, 2.2], [2.3, 659.25, 2.2]] },
            { bass: 55.00, pad: [110.00, 164.81, 220.00, 261.63], mel: [[0.4, 523.25, 2.8]] },
            { bass: 58.27, pad: [116.54, 174.61, 220.00, 293.66], mel: [[0.3, 587.33, 2.1], [2.2, 698.46, 2.4]] },
            { bass: 65.41, pad: [130.81, 196.00, 261.63, 329.63], mel: [[0.4, 659.25, 2.9]] }
        ];
        const act4Bars = [
            { bass: 58.27, pad: [116.54, 174.61, 220.00, 293.66], mel: [[0.5, 587.33, 3.0]] },
            { bass: 65.41, pad: [130.81, 196.00, 261.63, 329.63], mel: [[0.5, 523.25, 3.1]] },
            { bass: 73.42, pad: [146.83, 220.00, 261.63, 329.63], mel: [[0.6, 440.00, 3.4]] },
            { bass: 73.42, pad: [146.83, 220.00, 293.66, 329.63], mel: [] }
        ];

        // Общий мягкий компрессор + тёплый фильтр (исключает любые щелчки и перегрузки)
        const warmBus = ctx.createBiquadFilter();
        warmBus.type = 'lowpass';
        warmBus.frequency.value = 1950;
        warmBus.Q.value = 0.5;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 24;
        comp.ratio.value = 4;
        comp.attack.value = 0.04;
        comp.release.value = 0.35;

        warmBus.connect(comp);
        comp.connect(cin.musicMaster);

        // Деликатное тёмное эхо (без перекрёстного «пим-пим» фидбэка)
        const softDelay = ctx.createDelay(1.0);
        softDelay.delayTime.value = 0.55;
        const softFb = ctx.createGain();
        softFb.gain.value = 0.16;
        const softFilt = ctx.createBiquadFilter();
        softFilt.type = 'lowpass';
        softFilt.frequency.value = 820;
        const softWet = ctx.createGain();
        softWet.gain.value = 0.18;

        softDelay.connect(softFilt);
        softFilt.connect(softFb);
        softFb.connect(softDelay);
        softFilt.connect(softWet);
        softWet.connect(warmBus);

        function playVelvetPad(bar, startTime, dur, energy) {
            // Глубокий чистый суб-бас (перекрытие +1.4 сек для полного слияния аккордов)
            const totalDur = dur + 1.4;
            const bOsc = ctx.createOscillator();
            const bGain = ctx.createGain();
            bOsc.type = 'sine';
            bOsc.frequency.setValueAtTime(bar.bass, startTime);
            bGain.gain.setValueAtTime(0.0001, startTime);
            bGain.gain.linearRampToValueAtTime(0.20 + energy * 0.08, startTime + 1.6);
            bGain.gain.setValueAtTime(0.18 + energy * 0.07, startTime + dur - 0.6);
            bGain.gain.linearRampToValueAtTime(0.0001, startTime + totalDur);
            bOsc.connect(bGain);
            bGain.connect(warmBus);
            bOsc.start(startTime);
            bOsc.stop(startTime + totalDur + 0.1);

            // Бархатные струнные (чистый sine + мягкий triangle, без резкой пилы)
            bar.pad.forEach((freq, idx) => {
                [-0.35, 0.35].forEach(det => {
                    const osc = ctx.createOscillator();
                    const g = ctx.createGain();
                    const lp = ctx.createBiquadFilter();
                    osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
                    osc.frequency.setValueAtTime(freq + det, startTime);
                    lp.type = 'lowpass';
                    lp.frequency.setValueAtTime(480 + energy * 320, startTime);
                    lp.frequency.linearRampToValueAtTime(760 + energy * 420, startTime + dur * 0.55);
                    lp.frequency.linearRampToValueAtTime(460 + energy * 260, startTime + totalDur);
                    const amp = (0.044 + energy * 0.022) / bar.pad.length;
                    g.gain.setValueAtTime(0.0001, startTime);
                    g.gain.linearRampToValueAtTime(amp, startTime + 1.7);
                    g.gain.setValueAtTime(amp * 0.9, startTime + dur - 0.5);
                    g.gain.linearRampToValueAtTime(0.0001, startTime + totalDur);
                    osc.connect(lp);
                    lp.connect(g);
                    g.connect(warmBus);
                    osc.start(startTime);
                    osc.stop(startTime + totalDur + 0.1);
                });
            });
        }

        // Певучая плавная нота (смычковый мягкий вход 0.38с — никаких «пим-пим»!)
        function playLegatoVoice(freq, startTime, holdSec, vel) {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const g2 = ctx.createGain();
            const lp = ctx.createBiquadFilter();
            const g = ctx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, startTime);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq * 2.0, startTime);
            g2.gain.setValueAtTime(0.09, startTime);

            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(1150, startTime);

            g.gain.setValueAtTime(0.0001, startTime);
            g.gain.linearRampToValueAtTime(vel, startTime + 0.38);
            g.gain.setValueAtTime(vel * 0.82, startTime + Math.max(0.5, holdSec * 0.55));
            g.gain.linearRampToValueAtTime(0.0001, startTime + holdSec + 0.75);

            osc1.connect(lp);
            osc2.connect(g2);
            g2.connect(lp);
            lp.connect(g);
            g.connect(warmBus);
            g.connect(softDelay);

            osc1.start(startTime);
            osc2.start(startTime);
            osc1.stop(startTime + holdSec + 0.85);
            osc2.stop(startTime + holdSec + 0.85);
        }

        cin.musicStep = 0;
        const barDur = 4.0;
        const scheduleBar = () => {
            if (!cin.running || cin.paused || !cin.audioCtx) return;
            const tBar = cin.audioCtx.currentTime + 0.08;
            const sec = cin.elapsed;

            let bank = act1Bars;
            let energy = 0.30;
            if (sec < 20) {
                bank = act1Bars;
                energy = 0.25 + (sec / 20) * 0.20;
            } else if (sec < 44) {
                bank = act2Bars;
                energy = 0.48 + Math.sin(((sec - 20) / 24) * Math.PI) * 0.20;
            } else if (sec < 72) {
                bank = act3Bars;
                energy = 0.62 + Math.sin(((sec - 44) / 28) * Math.PI) * 0.22;
            } else {
                bank = act4Bars;
                energy = Math.max(0.14, 0.64 * (1 - (sec - 72) / 18));
            }

            if (sec > TOTAL_DURATION - 5.0) {
                const rem = Math.max(0, TOTAL_DURATION - sec) / 5.0;
                cin.musicMaster.gain.setTargetAtTime(0.32 * rem, tBar, 0.45);
            }

            const bar = bank[cin.musicStep % bank.length];
            playVelvetPad(bar, tBar, barDur, energy);

            bar.mel.forEach(([offsetSec, freq, hold]) => {
                const vel = 0.055 + energy * 0.032;
                playLegatoVoice(freq, tBar + offsetSec, hold, vel);
            });

            cin.musicStep++;
        };

        scheduleBar();
        cin.musicTimerId = setInterval(scheduleBar, barDur * 1000);
    }

    // =========================================================================
    // 2. ЕДИНАЯ НЕПРЕРЫВНАЯ СПЛАЙН-ТРАЕКТОРИЯ КАМЕРЫ (ОТ ВЫХОДА ИЗ ОБЛАКОВ ДО ФИНАЛА)
    // =========================================================================
    function getFacWorldPos(id, fallbackLon, fallbackLat) {
        if (typeof FACILITIES_DATA !== 'undefined') {
            const f2 = FACILITIES_DATA.find(f => f.id === id);
            if (f2 && f2.position) return f2.position.clone();
        }
        if (typeof SAKHALIN1_FACILITIES_DATA !== 'undefined') {
            const f1 = SAKHALIN1_FACILITIES_DATA.find(f => f.id === id);
            if (f1 && f1.position) return f1.position.clone();
        }
        if (typeof lonLatToVec3 === 'function' && fallbackLon !== undefined) {
            return lonLatToVec3(fallbackLon, fallbackLat, 0.5);
        }
        return new THREE.Vector3(0, 0, 0);
    }

    function getFacInfo(id) {
        if (typeof FACILITIES_DATA !== 'undefined') {
            const f2 = FACILITIES_DATA.find(f => f.id === id);
            if (f2) return f2;
        }
        if (typeof SAKHALIN1_FACILITIES_DATA !== 'undefined') {
            const f1 = SAKHALIN1_FACILITIES_DATA.find(f => f.id === id);
            if (f1) return f1;
        }
        return null;
    }

    function worldFromLonLat(lon, lat, y = 0) {
        const [x, z] = lonLatToXZ(lon, lat);
        return new THREE.Vector3(x, y, z);
    }

    let trackNodes = null;
    let finalCloudCenter = { x: 0, z: 0 };

    // Хореография живого флота и вертолёта, чтобы корабли и вертолёт гарантированно были прямо в кадре!
    function stageShip(shipList, id, targetT) {
        if (!shipList) return;
        const sh = shipList.find(s => s && s.facility && s.facility.id === id);
        if (!sh) return;
        sh.state = 'cruising';
        sh.dockTimer = 0;
        sh.t = targetT;
        sh.speedFactor = 1.0;
        sh.nextStopIndex = 0;
        if (sh.group) sh.group.visible = true;
        if (sh.routeLine) sh.routeLine.visible = true;
    }

    function launchHeliBetweenPads(fromIdx, toIdx) {
        if (typeof s2Runtime === 'undefined' || !s2Runtime.initialized || !s2Runtime.heliPads || s2Runtime.heliPads.length < 2) return;
        s2Runtime.heliFromIdx = fromIdx % s2Runtime.heliPads.length;
        s2Runtime.heliToIdx = toIdx % s2Runtime.heliPads.length;
        s2Runtime.heliCurPos.copy(s2Runtime.heliPads[s2Runtime.heliFromIdx].pos);
        s2Runtime.heliState = 'landed';
        s2Runtime.heliTimer = 0.15;
    }

    function buildSmoothCameraSplines(startPos, startTgt, startT) {
        const pPaB = getFacWorldPos('pa-b', 143.62, 53.02);
        const pPaA = getFacWorldPos('pa-a', 143.65, 52.71);
        const pLunA = getFacWorldPos('lun-a', 143.78, 51.68);
        const pObtk = getFacWorldPos('obtk', 143.00, 51.68);
        const pNks2 = getFacWorldPos('nks-2', 142.84, 49.25);
        const pPrig = getFacWorldPos('lng-plant', 142.96, 46.66);
        const pAniva = getFacWorldPos('aniva-lighthouse', 143.43, 46.01);

        const pChayvo = getFacWorldPos('s1-chayvo', 143.02, 52.40);
        const pOrlan = getFacWorldPos('s1-orlan', 143.36, 52.40);
        const pBerkut = getFacWorldPos('s1-berkut', 143.92, 52.44);
        const pDeKastri = getFacWorldPos('s1-dekastri', 140.78, 51.47);

        const pPdk = getFacWorldPos('s3-pdk', 143.52, 51.30);
        const pBtk = getFacWorldPos('s3-btk', 143.08, 51.20);

        const pGks = getFacWorldPos('s3-gks', 142.94, 51.78);
        const pNev = getFacWorldPos('s3-nevelskoy', 141.58, 52.23);
        const pKhab = getFacWorldPos('s1-khabarovsk', 135.07, 48.48);
        const pVlad = getFacWorldPos('s1-vladivostok', 131.89, 43.12);
        const pIslandCenter = worldFromLonLat(142.85, 50.35, 0);

        finalCloudCenter = { x: pIslandCenter.x, z: pIslandCenter.z };

        const t0 = startT;
        const t1 = Math.min(9.0, t0 + 1.9);
        const sPos = startPos ? startPos.clone() : new THREE.Vector3(85, 132, 105);
        const sTgt = startTgt ? startTgt.clone() : new THREE.Vector3(4, 0, 8);

        const diveMidPos = new THREE.Vector3(
            sPos.x * 0.42 + (pPaB.x + 48) * 0.58,
            Math.max(54, sPos.y * 0.48),
            sPos.z * 0.38 + (pPaB.z + 52) * 0.62
        );
        const diveMidTgt = new THREE.Vector3(
            sTgt.x * 0.35 + pPaB.x * 0.65,
            1.4,
            sTgt.z * 0.35 + (pPaB.z + 10) * 0.65
        );

        trackNodes = [
            // 0–1: Вход сквозь расходящиеся облака прямо на северный шельф
            { t: t0,   pos: sPos,                                                         tgt: sTgt },
            { t: t1,   pos: diveMidPos,                                                   tgt: diveMidTgt },
            // 2: Платформа ПА-Б (рядом вертолёт и ледокол обеспечения «Фёдор Ушаков»)
            { t: 10.2, pos: new THREE.Vector3(pPaB.x + 19, 14, pPaB.z + 19),              tgt: new THREE.Vector3(pPaB.x, 1.4, pPaB.z + 2) },
            // 3: Платформа ПА-А «Моликпак»
            { t: 14.4, pos: new THREE.Vector3(pPaA.x + 16, 12.5, pPaA.z + 18),            tgt: new THREE.Vector3(pPaA.x, 1.4, pPaA.z + 1) },
            // 4: Газовая платформа «Лунская-А» (ЛУН-А)
            { t: 19.0, pos: new THREE.Vector3(pLunA.x + 17, 13, pLunA.z + 18),            tgt: new THREE.Vector3(pLunA.x, 1.4, pLunA.z + 1) },
            // 5: ОБТК (Ноглики) и старт 800-км коридора
            { t: 23.2, pos: new THREE.Vector3(pObtk.x + 18, 13.5, pObtk.z + 18),          tgt: new THREE.Vector3(pObtk.x + 2, 1.1, pObtk.z) },
            // 6: Вдоль 800-км трассы и НКС № 2
            { t: 26.8, pos: new THREE.Vector3(pNks2.x + 26, 20, pNks2.z + 14),            tgt: new THREE.Vector3(pNks2.x, 0.9, pNks2.z - 2) },
            // 7: Залив Анива — ПК «Пригородное» (в кадре газовоз СПГ «Гранд Анива» у причала + танкер у ВПУ!)
            { t: 30.8, pos: new THREE.Vector3(pPrig.x - 10, 12.5, pPrig.z + 24),          tgt: new THREE.Vector3(pPrig.x + 2.0, 0.7, pPrig.z + 4.5) },
            // 8: Панорама СПГ, ТОН, ВПУ и обоих живых танкеров
            { t: 35.4, pos: new THREE.Vector3(pPrig.x + 17, 10.5, pPrig.z + 22),          tgt: new THREE.Vector3(pPrig.x + 3.0, 0.6, pPrig.z + 5.0) },
            // 9: Маяк Анива и подъём на север (зима + Сахалин-1)
            { t: 38.6, pos: new THREE.Vector3(pAniva.x + 22, 22, pAniva.z + 20),          tgt: new THREE.Vector3(pPrig.x + 4, 0.5, pAniva.z) },

            // 10: Сахалин-1 зимой — Чайво и «Ястреб»
            { t: 42.4, pos: new THREE.Vector3(pChayvo.x + 21, 18, pChayvo.z + 21),        tgt: new THREE.Vector3(pChayvo.x + 2, 1.0, pChayvo.z) },
            // 11: Платформы «Орлан» и «Беркут»
            { t: 46.6, pos: new THREE.Vector3(pBerkut.x + 14, 13, pBerkut.z + 19),        tgt: new THREE.Vector3((pOrlan.x + pBerkut.x) * 0.5, 1.0, pBerkut.z) },
            // 12: Через ледовый Татарский пролив к Де-Кастри (в кадре паром и ледовый танкер!)
            { t: 51.4, pos: new THREE.Vector3(pDeKastri.x + 19, 17, pDeKastri.z + 23),    tgt: new THREE.Vector3(pDeKastri.x + 3, 0.5, pDeKastri.z + 2) },
            // 13: Близкий пролёт над ВПУ Де-Кастри и ледовым танкером Aframax
            { t: 55.2, pos: new THREE.Vector3(pDeKastri.x + 12, 11, pDeKastri.z + 17),    tgt: new THREE.Vector3(pDeKastri.x + 2, 0.4, pDeKastri.z + 1) },

            // 14: Сахалин-3 (подводный X-Ray) — Киринское ПДК и БТК
            { t: 59.4, pos: new THREE.Vector3(pPdk.x + 19, 13.5, pPdk.z + 17),            tgt: new THREE.Vector3(pPdk.x - 2, -1.2, pPdk.z + 1) },
            { t: 64.2, pos: new THREE.Vector3(pBtk.x + 17, 10, pBtk.z + 15),              tgt: new THREE.Vector3(pPdk.x - 1, -1.5, pPdk.z + 2) },

            // 15–17: Ночной снежный МГП СХВ — Невельского -> Хабаровск -> Владивосток
            { t: 67.8, pos: new THREE.Vector3(pNev.x + 26, 26, pNev.z + 30),              tgt: new THREE.Vector3(pGks.x - 10, 0.5, pNev.z) },
            { t: 71.8, pos: new THREE.Vector3(pKhab.x + 34, 34, pKhab.z + 42),            tgt: new THREE.Vector3(pKhab.x, 0.5, pKhab.z) },
            { t: 75.2, pos: new THREE.Vector3(pVlad.x + 26, 26, pVlad.z + 32),            tgt: new THREE.Vector3(pVlad.x, 0.5, pVlad.z) },

            // 18: Полное отдаление на ВЕСЬ остров Сахалин (от северного до южного мыса!)
            { t: 81.2, pos: new THREE.Vector3(pIslandCenter.x + 118, 174, pIslandCenter.z + 138), tgt: new THREE.Vector3(pIslandCenter.x, 0, pIslandCenter.z) },
            // 19: Медленный подъём над всем островом во время смыкания 3D-облаков
            { t: 90.0, pos: new THREE.Vector3(pIslandCenter.x + 132, 218, pIslandCenter.z + 154), tgt: new THREE.Vector3(pIslandCenter.x, 0, pIslandCenter.z) }
        ];

        cin.camPosCurve = new THREE.CatmullRomCurve3(trackNodes.map(n => n.pos), false, 'centripetal', 0.5);
        cin.camTgtCurve = new THREE.CatmullRomCurve3(trackNodes.map(n => n.tgt), false, 'centripetal', 0.5);
    }

    function sampleSmoothCamera(t) {
        if (!trackNodes || !cin.camPosCurve) return null;
        const N = trackNodes.length;
        if (t <= trackNodes[0].t) return { pos: trackNodes[0].pos, tgt: trackNodes[0].tgt };
        if (t >= trackNodes[N - 1].t) return { pos: trackNodes[N - 1].pos, tgt: trackNodes[N - 1].tgt };

        let idx = 0;
        for (let i = 0; i < N - 1; i++) {
            if (t >= trackNodes[i].t && t <= trackNodes[i + 1].t) {
                idx = i;
                break;
            }
        }
        const segT = (t - trackNodes[idx].t) / Math.max(0.001, trackNodes[idx + 1].t - trackNodes[idx].t);
        const u = (idx + segT) / (N - 1);
        return {
            pos: cin.camPosCurve.getPoint(Math.max(0, Math.min(1, u))),
            tgt: cin.camTgtCurve.getPoint(Math.max(0, Math.min(1, u)))
        };
    }

    function triggerVirtualClick(facId, accentHex, startT, endT) {
        const fac = getFacInfo(facId);
        if (!fac) return;
        const pos = fac.position ? fac.position.clone() : new THREE.Vector3();
        if (typeof highlightPipelineChain === 'function') {
            highlightPipelineChain(facId);
        }
        cin.clickRipple = { worldPos: pos, startT, accent: accentHex };
        cin.activeCard = {
            facId,
            badge: fac.categoryLabel || fac.code,
            code: fac.code,
            title: fac.name,
            location: fac.location,
            specs: (fac.specs || []).slice(0, 4),
            accent: accentHex,
            startT,
            endT,
            worldPos: pos
        };
    }

    function runOnce(key, fn) {
        if (cin.firedEvents.has(key)) return;
        cin.firedEvents.add(key);
        try { fn(); } catch (err) { console.warn('Cinematic event:', key, err); }
    }

    function processTimelineEvents(t) {
        const en = (cin.lang === 'en');

        runOnce('intro-title', () => {
            cin.titleOverlay = {
                top: en ? 'PTK SakhSU  •  3D ATLAS' : 'ПТК СахГУ  •  3D-АТЛАС',
                main: en ? 'SAKHALIN & FAR EAST ENERGY' : 'НЕФТЕГАЗОВЫЕ ПРОЕКТЫ САХАЛИНА',
                sub: '',
                startT: 0.4,
                endT: 6.4,
                bottomStyle: true
            };
            cin.activeChapter = {
                tag: en ? 'ORBITAL VIEW' : 'ВИД ИЗ КОСМОСА',
                title: en ? 'Russian Far East & Sakhalin Island' : 'Дальний Восток и остров Сахалин',
                accent: '#38bdf8'
            };
        });

        // В синематике показываем центр герба первые 3 секунды, затем плавно углубляем в Землю перед нырком!
        if (t >= 3.0) {
            runOnce('cin-hide-core', () => {
                if (typeof globeIntro !== 'undefined') globeIntro.cinematicForceHideCore = true;
            });
        }

        // Даём эмблеме СахГУ полностью отыграть на переднем плане, углубиться в Землю,
        // а планете ещё пару секунд покрутиться внутри кольца «СахГУ» — и только потом ныряем!
        if (t >= 6.2) {
            runOnce('globe-dive', () => {
                if (typeof isGlobeIntroActive !== 'undefined' && isGlobeIntroActive && typeof enterMapFromGlobe === 'function') {
                    enterMapFromGlobe();
                }
            });
        }

        // Как только глобус переключил нас на 3D-сцену над облаками — мгновенно подхватываем ЖИВУЮ камеру
        // в единый непрерывный пролёт (никаких остановок, никакого телепорта и фриза!)
        if (cin.firedEvents.has('globe-dive') && typeof isGlobeIntroActive !== 'undefined' && !isGlobeIntroActive && !cin.mapSplineReady) {
            cin.mapSplineReady = true;
            cin.mapEnterT = t;
            if (typeof showBackgroundProjects !== 'undefined') showBackgroundProjects = true;
            if (typeof areLabelsVisible !== 'undefined') areLabelsVisible = false;
            if (typeof cameraTransition !== 'undefined') cameraTransition.active = false;

            if (typeof controls !== 'undefined' && controls) {
                cin.savedControlsEnabled = controls.enabled;
                cin.savedControlsDamping = controls.enableDamping;
                controls.enabled = false;
                controls.enableDamping = false;
            }

            const livePos = (typeof camera !== 'undefined' && camera) ? camera.position.clone() : new THREE.Vector3(85, 132, 105);
            const liveTgt = (typeof controls !== 'undefined' && controls) ? controls.target.clone() : new THREE.Vector3(4, 0, 8);
            cin.curPos.copy(livePos);
            cin.curTarget.copy(liveTgt);
            buildSmoothCameraSplines(livePos, liveTgt, t);

            cin.activeChapter = {
                tag: en ? 'SUMMER • DAY  |  SAKHALIN-2' : 'ЛЕТО • ДЕНЬ  |  ПРОЕКТ «САХАЛИН-2»',
                title: en ? 'Northern Offshore Platforms & 800 km System' : 'Северный шельф и 800-км система',
                accent: '#10b981'
            };
        }

        // Выводим ледокол снабжения и вертолёт прямо на северный шельф к подлёту камеры
        if (t >= 7.8) {
            runOnce('stage-north-alive', () => {
                if (typeof movingShips !== 'undefined') stageShip(movingShips, 'supply-vessel', 0.22);
                launchHeliBetweenPads(0, 1); // Взлёт вертолёта с ПА-Б к «Моликпак»!
            });
        }

        // Все 3 морские платформы «Сахалин-2» + ОБТК по очереди!
        if (t >= 9.4)  runOnce('click-pab',  () => triggerVirtualClick('pa-b',  '#10b981', 9.4,  13.2));
        if (t >= 13.6) runOnce('click-paa',  () => triggerVirtualClick('pa-a',  '#10b981', 13.6, 17.4));
        if (t >= 17.8) {
            runOnce('click-luna', () => {
                launchHeliBetweenPads(1, 2); // Вертолёт летит дальше к «Лунской-А»!
                triggerVirtualClick('lun-a', '#10b981', 17.8, 21.4);
            });
        }
        if (t >= 21.8) runOnce('click-obtk', () => triggerVirtualClick('obtk', '#10b981', 21.8, 25.6));

        // Подводим газовоз СПГ «Гранд Анива» и танкер «Залив Анива» прямо к причалам ПК «Пригородное»!
        if (t >= 27.5) {
            runOnce('stage-aniva-ships', () => {
                if (typeof movingShips !== 'undefined') {
                    stageShip(movingShips, 'lng-carrier', 0.085);
                    stageShip(movingShips, 'tanker-aniva', 0.075);
                }
            });
        }

        if (t >= 29.2) {
            runOnce('click-prig', () => {
                cin.activeChapter = {
                    tag: en ? 'SUMMER • DAY  |  ANIVA BAY' : 'ЛЕТО • ДЕНЬ  |  ЗАЛИВ АНИВА',
                    title: en ? 'Prigorodnoye Complex: LNG Plant, OET & Tankers' : 'ПК «Пригородное»: завод СПГ, ТОН и флот',
                    accent: '#10b981'
                };
                triggerVirtualClick('lng-plant', '#10b981', 29.2, 36.2);
            });
        }

        if (t >= 38.6) {
            runOnce('s1-winter', () => {
                if (typeof switchProjectTab === 'function') switchProjectTab('sakhalin1');
                if (typeof cameraTransition !== 'undefined') cameraTransition.active = false;
                if (typeof setWeatherMode === 'function') setWeatherMode(1, true);
                cin.flareSweep = { startT: t, accent: '#f97316' };
                cin.activeChapter = {
                    tag: en ? 'SNOW • DAY  |  SAKHALIN-1' : 'СНЕГ • ДЕНЬ  |  ПРОЕКТ «САХАЛИН-1»',
                    title: en ? 'Chayvo, Orlan, Berkut & De-Kastri Ice Export' : 'Чайво, «Орлан», «Беркут» и Де-Кастри',
                    accent: '#f97316'
                };
            });
        }

        if (t >= 41.2) runOnce('click-chayvo',   () => triggerVirtualClick('s1-chayvo',   '#f97316', 41.2, 44.8));
        if (t >= 45.2) runOnce('click-berkut',   () => triggerVirtualClick('s1-berkut',   '#f97316', 45.2, 49.4));

        // Подводим ледовый танкер «Де-Кастри» прямо к башне ВПУ ровно к подлёту камеры!
        if (t >= 49.4) {
            runOnce('stage-dekastri-tanker', () => {
                if (typeof s1MovingShips !== 'undefined') stageShip(s1MovingShips, 's1-tanker-dekastri', 0.035);
            });
        }

        if (t >= 50.4) runOnce('click-dekastri', () => triggerVirtualClick('s1-dekastri', '#f97316', 50.4, 55.6));

        if (t >= 56.6) {
            runOnce('s3-subsea', () => {
                if (typeof switchProjectTab === 'function') switchProjectTab('sakhalin3');
                if (typeof cameraTransition !== 'undefined') cameraTransition.active = false;
                // Чистое лето без снега и льдов, чтобы подводный X-Ray Сахалин-3 был идеально виден!
                if (typeof setWeatherMode === 'function') setWeatherMode(0, true);
                // В синематике НЕ скрываем материк ДВ на 8 секунд между Де-Кастри и Хабаровском — мир остаётся цельным!
                if (typeof startMainlandFade === 'function') startMainlandFade(true, 0.5);
                cin.flareSweep = { startT: t, accent: '#38bdf8' };
                cin.activeChapter = {
                    tag: en ? 'SUMMER • SUBSEA X-RAY  |  SAKHALIN-3' : 'ЛЕТО • ПОДВОДНЫЙ X-RAY  |  ПРОЕКТ «САХАЛИН-3»',
                    title: en ? 'Kirinsky Block — 100% Seabed Gas Production' : 'Киринский блок — 100% подводная добыча газа',
                    accent: '#38bdf8'
                };
            });
        }

        if (t >= 58.6) runOnce('click-pdk', () => triggerVirtualClick('s3-pdk', '#38bdf8', 58.6, 64.4));

        if (t >= 65.4) {
            runOnce('shv-snow', () => {
                if (typeof switchProjectTab === 'function') switchProjectTab('shv');
                if (typeof cameraTransition !== 'undefined') cameraTransition.active = false;
                // На пролёте МГП СХВ появляется дневной снег
                if (typeof setWeatherMode === 'function') setWeatherMode(1, true);
                cin.flareSweep = { startT: t, accent: '#ef4444' };
                cin.activeChapter = {
                    tag: en ? 'SNOW • DAY  |  SHV GAS TRUNKLINE' : 'СНЕГ • ДЕНЬ  |  МГП СХВ (> 1 820 КМ)',
                    title: en ? 'Sakhalin – Khabarovsk – Vladivostok' : 'Сахалин — Хабаровск — Владивосток',
                    accent: '#ef4444'
                };
            });
        }

        if (t >= 69.2) runOnce('click-khab', () => triggerVirtualClick('s1-khabarovsk', '#ef4444', 69.2, 73.6));

        // В конце пролёта (Владивосток и панорама всего острова) наступает ночь с огнями городов!
        if (t >= 73.8) {
            runOnce('finale-night', () => {
                if (typeof setWeatherMode === 'function') setWeatherMode(2, true);
                cin.activeChapter = {
                    tag: en ? 'SNOW • NIGHT  |  SHV & FINALE' : 'СНЕГ • НОЧЬ  |  МГП СХВ • ФИНАЛ',
                    title: en ? 'Vladivostok & Sakhalin Island Panorama' : 'Владивосток и панорама острова Сахалин',
                    accent: '#ef4444'
                };
            });
        }

        // Сначала полностью отдаляемся на весь остров Сахалин (81.2с), даём спокойно полюбоваться,
        // и только потом (82.2с) плавно смыкаем объёмные 3D-облака!
        if (t >= 82.2) {
            runOnce('close-clouds-finale', () => {
                if (typeof highlightPipelineChain === 'function') highlightPipelineChain(null);
                if (typeof setWorldCloudsAperture === 'function') {
                    setWorldCloudsAperture('closed', {
                        centerX: finalCloudCenter.x,
                        centerZ: finalCloudCenter.z,
                        duration: 5.8
                    });
                }
            });
        }

        if (t >= 83.8) {
            runOnce('outro-title', () => {
                cin.titleOverlay = {
                    top: '',
                    main: en ? 'SAKHALIN & RUSSIAN FAR EAST' : 'САХАЛИН И ДАЛЬНИЙ ВОСТОК',
                    sub: '',
                    partnersLabel: '',
                    authorLabel: en ? 'PTK SakhSU  •  Alexander Chmulev' : 'ПТК СахГУ  •  Александр Чмулев',
                    showPartners: true,
                    startT: 83.9,
                    endT: TOTAL_DURATION
                };
            });
        }
    }

    // Предзагрузка официальных логотипов партнёров (100% офлайн data URI, без taint canvas)
    const cinPartnerImgs = { gazprom: null, sakhalinEnergy: null, rosneft: null };
    if (window.PARTNER_LOGOS) {
        if (window.PARTNER_LOGOS.gazprom) {
            const imgGp = new Image();
            imgGp.src = window.PARTNER_LOGOS.gazprom;
            cinPartnerImgs.gazprom = imgGp;
        }
        if (window.PARTNER_LOGOS.sakhalinEnergy) {
            const imgSe = new Image();
            imgSe.src = window.PARTNER_LOGOS.sakhalinEnergy;
            cinPartnerImgs.sakhalinEnergy = imgSe;
        }
        if (window.PARTNER_LOGOS.rosneft) {
            const imgRn = new Image();
            imgRn.src = window.PARTNER_LOGOS.rosneft;
            cinPartnerImgs.rosneft = imgRn;
        }
    }

    // =========================================================================
    // 3. КИНО-ОВЕРЛЕЙ (ТИТРЫ, КАРТОЧКИ, КЛИКИ, ПОЛОСЫ 2.35:1, ПРОЛЁТ СКВОЗЬ ОБЛАКА)
    // =========================================================================
    function roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function wrapCanvasText(ctx, text, maxW, maxLines = 2) {
        const words = String(text || '').split(' ');
        const lines = [];
        let cur = '';
        for (let i = 0; i < words.length; i++) {
            const test = cur ? (cur + ' ' + words[i]) : words[i];
            if (ctx.measureText(test).width > maxW && cur) {
                lines.push(cur);
                cur = words[i];
                if (lines.length >= maxLines) break;
            } else {
                cur = test;
            }
        }
        if (cur && lines.length < maxLines) lines.push(cur);
        return lines;
    }

    function fitCanvasLine(ctx, text, maxW, basePx, minPx, weight) {
        let px = basePx;
        const str = String(text || '');
        while (px > minPx) {
            ctx.font = `${weight} ${Math.round(px)}px Inter, Segoe UI, sans-serif`;
            if (ctx.measureText(str).width <= maxW) break;
            px -= 0.75;
        }
        ctx.font = `${weight} ${Math.round(px)}px Inter, Segoe UI, sans-serif`;
        return str;
    }

    function drawCinematicOverlays(ctx, W, H, t) {
        const sc = W / 1920;
        const barH = Math.round(52 * sc);

        // Мягкая атмосферная дымка входа в облака (попадает и в записанное видео!)
        if (cin.firedEvents.has('globe-dive')) {
            const mistCenter = cin.mapSplineReady ? cin.mapEnterT : 6.95;
            const distFromHandoff = Math.abs(t - mistCenter);
            if (distFromHandoff < 0.55) {
                const k = 1 - distFromHandoff / 0.55;
                const mistAlpha = k * k * 0.52;
                const grad = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.05, W * 0.5, H * 0.5, W * 0.65);
                grad.addColorStop(0, `rgba(226, 238, 249, ${mistAlpha.toFixed(3)})`);
                grad.addColorStop(1, `rgba(186, 208, 232, ${(mistAlpha * 0.85).toFixed(3)})`);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, W, H);
            }
        }

        // Мягкая кино-виньетка по краям кадра для глубины и контраста
        const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, W * 0.28, W * 0.5, H * 0.5, W * 0.68);
        vig.addColorStop(0, 'rgba(2, 6, 23, 0)');
        vig.addColorStop(1, 'rgba(2, 6, 23, 0.36)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);

        // Кино-полосы 2.35:1 + тонкая световая кайма и прогресс-линия актов
        ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
        ctx.fillRect(0, 0, W, barH);
        ctx.fillRect(0, H - barH, W, barH);

        const chAccent = (cin.activeChapter && cin.activeChapter.accent) ? cin.activeChapter.accent : '#38bdf8';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.fillRect(0, barH - 1, W, 1);
        ctx.fillRect(0, H - barH, W, 1);

        // Тонкая светящаяся полоса прогресса фильма по границе нижней кино-полосы
        const prog = Math.max(0, Math.min(1, t / TOTAL_DURATION));
        const progGrad = ctx.createLinearGradient(0, 0, W * prog, 0);
        progGrad.addColorStop(0, '#38bdf8');
        progGrad.addColorStop(0.55, '#10b981');
        progGrad.addColorStop(1, chAccent);
        ctx.fillStyle = progGrad;
        ctx.fillRect(0, H - barH, W * prog, Math.max(2, 2.5 * sc));

        // Компактная строка актов внутри нижней кино-полосы
        if (t > 0.6 && t < TOTAL_DURATION - 1.2) {
            const en = (cin.lang === 'en');
            const acts = en
                ? [
                    { label: '01 ORBIT', s: 0, e: 8.5 },
                    { label: '02 SAKHALIN-2', s: 8.5, e: 37.5 },
                    { label: '03 SAKHALIN-1', s: 37.5, e: 58.0 },
                    { label: '04 SAKHALIN-3 & SHV', s: 58.0, e: 90.0 }
                ]
                : [
                    { label: '01 ОРБИТА', s: 0, e: 8.5 },
                    { label: '02 САХАЛИН-2', s: 8.5, e: 37.5 },
                    { label: '03 САХАЛИН-1', s: 37.5, e: 58.0 },
                    { label: '04 САХАЛИН-3 И МГП СХВ', s: 58.0, e: 90.0 }
                ];
            ctx.save();
            ctx.font = `700 ${Math.round(11.5 * sc)}px Inter, Segoe UI, sans-serif`;
            ctx.textAlign = 'center';
            const segW = W / acts.length;
            for (let i = 0; i < acts.length; i++) {
                const isCur = t >= acts[i].s && t < acts[i].e;
                ctx.fillStyle = isCur ? '#f8fafc' : 'rgba(148, 163, 184, 0.45)';
                ctx.fillText(acts[i].label, segW * (i + 0.5), H - barH * 0.36);
            }
            ctx.restore();
        }

        // Мягкий анаморфный световой блик при смене актов / сезонов
        if (cin.flareSweep && t >= cin.flareSweep.startT && t <= cin.flareSweep.startT + 1.45) {
            const p = (t - cin.flareSweep.startT) / 1.45;
            const fa = Math.sin(p * Math.PI) * 0.34;
            const fx = (-0.2 + p * 1.4) * W;
            const fy = H * 0.38;
            ctx.save();
            ctx.globalAlpha = fa;
            const fg = ctx.createRadialGradient(fx, fy, 4 * sc, fx, fy, 360 * sc);
            fg.addColorStop(0, '#ffffff');
            fg.addColorStop(0.28, cin.flareSweep.accent || '#38bdf8');
            fg.addColorStop(1, 'rgba(2, 6, 23, 0)');
            ctx.fillStyle = fg;
            ctx.save();
            ctx.translate(fx, fy);
            ctx.scale(2.8, 0.24);
            ctx.beginPath();
            ctx.arc(0, 0, 260 * sc, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            ctx.restore();
        }

        // Живая телеметрия в правом верхнем углу (координаты, высота камеры и атмосфера)
        if (!isGlobeIntroActive && t > 7.4 && t < 83.6 && controls && controls.target) {
            const telAlpha = t < 8.6 ? (t - 7.4) / 1.2 : (t > 81.8 ? Math.max(0, (83.6 - t) / 1.8) : 1.0);
            const en = (cin.lang === 'en');
            const cLon = (typeof CENTER_LON !== 'undefined' && typeof LON_SCALE !== 'undefined')
                ? (CENTER_LON + controls.target.x / LON_SCALE) : 143.0;
            const cLat = (typeof CENTER_LAT !== 'undefined' && typeof LAT_SCALE !== 'undefined')
                ? (CENTER_LAT - controls.target.z / LAT_SCALE) : 51.0;
            const altKm = camera ? Math.max(0.8, camera.position.y * 1.15) : 12.0;
            const altStr = en ? `ALT ${altKm.toFixed(1)} km` : `ВЫС. ${altKm.toFixed(1)} км`;
            const coordStr = `${Math.max(41, Math.min(62, cLat)).toFixed(2)}°N  ${Math.max(125, Math.min(150, cLon)).toFixed(2)}°E  •  ${altStr}`;
            const wIdx = (typeof weatherModeIndex !== 'undefined') ? weatherModeIndex : 0;
            const atmStr = en
                ? (wIdx === 2 ? 'WINTER • NIGHT' : (wIdx === 1 ? 'WINTER • DAY' : 'SUMMER • DAY'))
                : (wIdx === 2 ? 'ЗИМА • НОЧЬ' : (wIdx === 1 ? 'ЗИМА • ДЕНЬ' : 'ЛЕТО • ДЕНЬ'));
            const atmCol = wIdx === 2 ? '#818cf8' : (wIdx === 1 ? '#7dd3fc' : '#fbbf24');

            ctx.save();
            ctx.globalAlpha = telAlpha;
            const pillW = 326 * sc;
            const pillH = 54 * sc;
            const pillX = W - pillW - 46 * sc;
            const pillY = barH + 24 * sc;
            roundRectPath(ctx, pillX, pillY, pillW, pillH, 14 * sc);
            ctx.fillStyle = 'rgba(10, 18, 34, 0.74)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
            ctx.lineWidth = 1.2 * sc;
            ctx.stroke();

            ctx.fillStyle = atmCol;
            ctx.beginPath();
            ctx.arc(pillX + 18 * sc, pillY + 19 * sc, 4 * sc, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = atmCol;
            ctx.font = `800 ${Math.round(11.5 * sc)}px Inter, Segoe UI, sans-serif`;
            ctx.fillText(atmStr, pillX + 30 * sc, pillY + 23 * sc);

            ctx.fillStyle = '#e2e8f0';
            ctx.font = `600 ${Math.round(12.5 * sc)}px Consolas, Menlo, monospace`;
            ctx.fillText(coordStr, pillX + 18 * sc, pillY + 43 * sc);
            ctx.restore();
        }

        // Виртуальный клик (кольцо-волна прямо на 3D-объекте)
        if (cin.clickRipple && !isGlobeIntroActive && camera) {
            const age = t - cin.clickRipple.startT;
            if (age >= 0 && age < 1.35) {
                const p = cin.clickRipple.worldPos.clone().project(camera);
                if (p.z < 1) {
                    const sx = (p.x * 0.5 + 0.5) * W;
                    const sy = (-p.y * 0.5 + 0.5) * H;
                    const k = age / 1.35;
                    ctx.save();
                    ctx.strokeStyle = cin.clickRipple.accent || '#38bdf8';
                    ctx.globalAlpha = Math.max(0, 1 - k) * 0.9;
                    ctx.lineWidth = Math.max(2, 4.2 * sc * (1 - k * 0.6));
                    ctx.beginPath();
                    ctx.arc(sx, sy, (16 + k * 74) * sc, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.fillStyle = '#ffffff';
                    ctx.globalAlpha = Math.max(0, 1 - k * 2.2);
                    ctx.beginPath();
                    ctx.arc(sx, sy, 7 * sc, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        // Плашка текущей главы (мягко скрывается, когда облака закрывают экран)
        if (cin.activeChapter && t > 1.0 && t < 84.5) {
            const ch = cin.activeChapter;
            const chAlpha = t > 82.3 ? Math.max(0, (84.5 - t) / 2.2) : 1.0;
            ctx.save();
            ctx.globalAlpha = chAlpha;
            const yTop = barH + 24 * sc;
            ctx.font = `800 ${Math.round(15 * sc)}px Inter, Segoe UI, sans-serif`;
            const w1 = ctx.measureText(ch.tag).width;
            ctx.font = `700 ${Math.round(21 * sc)}px Inter, Segoe UI, sans-serif`;
            const w2 = ctx.measureText(ch.title).width;
            const boxW = Math.max(w1, w2) + 70 * sc;
            const boxH = 72 * sc;
            const boxX = 46 * sc;

            roundRectPath(ctx, boxX, yTop, boxW, boxH, 16 * sc);
            ctx.fillStyle = 'rgba(10, 18, 34, 0.80)';
            ctx.fill();
            ctx.strokeStyle = ch.accent || '#38bdf8';
            ctx.globalAlpha = chAlpha * 0.55;
            ctx.lineWidth = 1.5 * sc;
            ctx.stroke();
            ctx.globalAlpha = chAlpha;

            roundRectPath(ctx, boxX + 15 * sc, yTop + 14 * sc, 5 * sc, boxH - 28 * sc, 3 * sc);
            ctx.fillStyle = ch.accent || '#38bdf8';
            ctx.fill();

            ctx.fillStyle = ch.accent || '#38bdf8';
            ctx.font = `800 ${Math.round(14 * sc)}px Inter, Segoe UI, sans-serif`;
            ctx.fillText(ch.tag, boxX + 32 * sc, yTop + 29 * sc);

            ctx.fillStyle = '#f8fafc';
            ctx.font = `700 ${Math.round(20 * sc)}px Inter, Segoe UI, sans-serif`;
            ctx.fillText(ch.title, boxX + 32 * sc, yTop + 55 * sc);
            ctx.restore();
        }

        // Кино-карточка выбранного объекта
        if (cin.activeCard && t >= cin.activeCard.startT && t <= cin.activeCard.endT) {
            const c = cin.activeCard;
            const fi = Math.min(1, (t - c.startT) / 0.52);
            const fo = Math.min(1, (c.endT - t) / 0.52);
            const a = Math.min(fi, fo);
            const ease = a * a * (3 - 2 * a);

            ctx.save();
            ctx.globalAlpha = ease;
            const cardW = 544 * sc;
            const cardH = 304 * sc;
            const cardX = W - cardW - 46 * sc + (1 - ease) * 40 * sc;
            const cardY = H - barH - cardH - 36 * sc;

            roundRectPath(ctx, cardX, cardY, cardW, cardH, 20 * sc);
            const cardBgGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
            cardBgGrad.addColorStop(0, 'rgba(12, 22, 42, 0.90)');
            cardBgGrad.addColorStop(1, 'rgba(6, 13, 28, 0.92)');
            ctx.fillStyle = cardBgGrad;
            ctx.fill();
            ctx.strokeStyle = c.accent || '#38bdf8';
            ctx.lineWidth = 2.0 * sc;
            ctx.stroke();

            // Анимированная выноска-линия от 3D-объекта прямо к карточке!
            if (c.worldPos && !isGlobeIntroActive && camera) {
                const wp = c.worldPos.clone().project(camera);
                if (wp.z < 1) {
                    const ox = (wp.x * 0.5 + 0.5) * W;
                    const oy = (-wp.y * 0.5 + 0.5) * H;
                    if (ox > 30 * sc && ox < cardX - 24 * sc && oy > barH + 20 * sc && oy < H - barH - 20 * sc) {
                        const tx = cardX;
                        const ty = cardY + 56 * sc;
                        const mx = ox + (tx - ox) * 0.55;
                        ctx.save();
                        ctx.globalAlpha = ease * 0.78;
                        ctx.strokeStyle = c.accent || '#38bdf8';
                        ctx.lineWidth = 1.6 * sc;
                        ctx.beginPath();
                        ctx.moveTo(ox, oy);
                        ctx.lineTo(mx, oy);
                        ctx.lineTo(tx, ty);
                        ctx.stroke();

                        // Точка-прицел на самом 3D-объекте
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(ox, oy, 4.5 * sc, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = c.accent || '#38bdf8';
                        ctx.lineWidth = 2.0 * sc;
                        ctx.beginPath();
                        ctx.arc(ox, oy, (10 + Math.sin(t * 5.0) * 2.5) * sc, 0, Math.PI * 2);
                        ctx.stroke();

                        // Точка входа на краю карточки
                        ctx.fillStyle = c.accent || '#38bdf8';
                        ctx.beginPath();
                        ctx.arc(tx, ty, 4 * sc, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }
            }

            const bx = cardX + 22 * sc;
            const by = cardY + 22 * sc;
            ctx.font = `800 ${Math.round(13 * sc)}px Inter, Segoe UI, sans-serif`;
            const badgeText = (c.badge || '').toUpperCase();
            const bw = ctx.measureText(badgeText).width + 24 * sc;
            roundRectPath(ctx, bx, by, bw, 27 * sc, 8 * sc);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fill();
            ctx.fillStyle = c.accent || '#38bdf8';
            ctx.fillText(badgeText, bx + 12 * sc, by + 18 * sc);

            // Фирменный логотип оператора в правом верхнем углу карточки (Сахалинская Энергия / Газпром / Роснефть)
            if (c.facId) {
                const isS2Op = ['pa-b', 'pa-a', 'uoug-north', 'lun-a', 'obtk', 'nks-2', 'uoug-south', 'lng-plant', 'tanker-aniva', 'lng-carrier', 'supply-vessel'].includes(c.facId);
                const isGpOp = c.facId.startsWith('s3-') || c.facId === 's1-komsomolsk' || c.facId === 's1-khabarovsk' || c.facId === 's1-vladivostok';
                const isRnOp = ['s1-odoptu', 's1-berkut', 's1-orlan', 's1-chayvo', 's1-dekastri', 's1-tanker-dekastri'].includes(c.facId);
                if (isS2Op && cinPartnerImgs.sakhalinEnergy && cinPartnerImgs.sakhalinEnergy.complete && cinPartnerImgs.sakhalinEnergy.naturalWidth > 0) {
                    const sz = 40 * sc;
                    ctx.drawImage(cinPartnerImgs.sakhalinEnergy, cardX + cardW - sz - 20 * sc, by - 4 * sc, sz, sz);
                } else if (isGpOp && cinPartnerImgs.gazprom && cinPartnerImgs.gazprom.complete && cinPartnerImgs.gazprom.naturalWidth > 0) {
                    const gh = 30 * sc;
                    const gw = gh * (cinPartnerImgs.gazprom.naturalWidth / cinPartnerImgs.gazprom.naturalHeight);
                    ctx.drawImage(cinPartnerImgs.gazprom, cardX + cardW - gw - 20 * sc, by - 1 * sc, gw, gh);
                } else if (isRnOp && cinPartnerImgs.rosneft && cinPartnerImgs.rosneft.complete && cinPartnerImgs.rosneft.naturalWidth > 0) {
                    const rh = 30 * sc;
                    const rw = rh * (cinPartnerImgs.rosneft.naturalWidth / cinPartnerImgs.rosneft.naturalHeight);
                    ctx.drawImage(cinPartnerImgs.rosneft, cardX + cardW - rw - 20 * sc, by - 1 * sc, rw, rh);
                }
            }

            ctx.fillStyle = '#ffffff';
            ctx.font = `800 ${Math.round(22 * sc)}px Inter, Segoe UI, sans-serif`;
            const titleLines = wrapCanvasText(ctx, c.title, cardW - 44 * sc, 2);
            let curY = by + 56 * sc;
            titleLines.forEach(line => {
                ctx.fillText(line, bx, curY);
                curY += 27 * sc;
            });

            ctx.fillStyle = '#94a3b8';
            ctx.font = `500 ${Math.round(13.5 * sc)}px Inter, Segoe UI, sans-serif`;
            const locLines = wrapCanvasText(ctx, c.location, cardW - 44 * sc, 2);
            let locY = curY + 2 * sc;
            locLines.forEach(l => {
                const fittedLoc = fitCanvasLine(ctx, l, cardW - 44 * sc, 13.5 * sc, 10.5 * sc, 500);
                ctx.fillText(fittedLoc, bx, locY);
                locY += 17 * sc;
            });

            const gridY = Math.max(cardY + 158 * sc, locY + 6 * sc);
            const cellW = (cardW - 56 * sc) * 0.5;
            const cellH = 54 * sc;
            const specs = c.specs || [];
            for (let i = 0; i < Math.min(4, specs.length); i++) {
                const col = i % 2;
                const row = Math.floor(i / 2);
                const cx = bx + col * (cellW + 12 * sc);
                const cy = gridY + row * (cellH + 10 * sc);
                roundRectPath(ctx, cx, cy, cellW, cellH, 11 * sc);
                ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.20)';
                ctx.lineWidth = 1 * sc;
                ctx.stroke();

                ctx.fillStyle = '#94a3b8';
                ctx.font = `700 ${Math.round(11 * sc)}px Inter, Segoe UI, sans-serif`;
                ctx.fillText(specs[i].label || '', cx + 11 * sc, cy + 18 * sc);

                ctx.fillStyle = '#f8fafc';
                const fittedVal = fitCanvasLine(ctx, specs[i].value || '', cellW - 22 * sc, 14 * sc, 10.5 * sc, 800);
                ctx.fillText(fittedVal, cx + 11 * sc, cy + 39 * sc);
            }
            ctx.restore();
        }

        // Центральные титры (вход и финал над закрывшимися облаками)
        if (cin.titleOverlay && t >= cin.titleOverlay.startT && t <= cin.titleOverlay.endT) {
            const to = cin.titleOverlay;
            const fi = Math.min(1, (t - to.startT) / 1.0);
            const fo = Math.min(1, (to.endT - t) / 1.0);
            const a = Math.min(fi, fo);
            const ease = a * a * (3 - 2 * a);

            ctx.save();
            ctx.globalAlpha = ease;
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(2, 6, 23, 0.92)';
            ctx.shadowBlur = 24 * sc;

            if (to.bottomStyle) {
                // Воздушный минималистичный нижний кинотитр (2 чистые строки, не перегружает герб СахГУ!)
                const rise = (1 - ease) * 14 * sc;
                if (to.top) {
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = `800 ${Math.round(14 * sc)}px Inter, Segoe UI, sans-serif`;
                    ctx.fillText(to.top, W * 0.5, H - barH - 58 * sc + rise);
                }

                const lineW = 180 * sc * ease;
                const lGrad = ctx.createLinearGradient(W * 0.5 - lineW * 0.5, 0, W * 0.5 + lineW * 0.5, 0);
                lGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
                lGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.78)');
                lGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                ctx.fillStyle = lGrad;
                ctx.fillRect(W * 0.5 - lineW * 0.5, H - barH - 48 * sc + rise, lineW, Math.max(1.5, 2 * sc));

                ctx.fillStyle = '#ffffff';
                ctx.font = `900 ${Math.round(32 * sc)}px Inter, Segoe UI, sans-serif`;
                ctx.fillText(to.main, W * 0.5, H - barH - 16 * sc + rise);
            } else {
                const rise = (1 - ease) * 18 * sc;
                const yShift = (to.showPartners ? -62 * sc : 0) + rise;
                if (to.top) {
                    ctx.fillStyle = '#38bdf8';
                    ctx.font = `800 ${Math.round(19 * sc)}px Inter, Segoe UI, sans-serif`;
                    ctx.fillText(to.top, W * 0.5, H * 0.43 + yShift);
                }

                ctx.fillStyle = '#ffffff';
                ctx.font = `900 ${Math.round(50 * sc)}px Inter, Segoe UI, sans-serif`;
                ctx.fillText(to.main, W * 0.5, H * 0.49 + yShift);

                const lineW = 280 * sc * ease;
                const lGrad = ctx.createLinearGradient(W * 0.5 - lineW * 0.5, 0, W * 0.5 + lineW * 0.5, 0);
                lGrad.addColorStop(0, 'rgba(56, 189, 248, 0)');
                lGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.80)');
                lGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
                ctx.fillStyle = lGrad;
                ctx.fillRect(W * 0.5 - lineW * 0.5, H * 0.49 + yShift + 18 * sc, lineW, Math.max(2, 2.5 * sc));

                if (to.sub) {
                    ctx.fillStyle = '#cbd5e1';
                    ctx.font = `600 ${Math.round(20 * sc)}px Inter, Segoe UI, sans-serif`;
                    ctx.fillText(to.sub, W * 0.5, H * 0.55 + yShift);
                }

                // Финальная стеклянная плашка с логотипами ПАО «Газпром», ООО «Сахалинская Энергия» и ПАО «НК «Роснефть»
                if (to.showPartners) {
                    const gpImg = cinPartnerImgs.gazprom;
                    const seImg = cinPartnerImgs.sakhalinEnergy;
                    const rnImg = cinPartnerImgs.rosneft;
                    const gpReady = gpImg && gpImg.complete && gpImg.naturalWidth > 0;
                    const seReady = seImg && seImg.complete && seImg.naturalWidth > 0;
                    const rnReady = rnImg && rnImg.complete && rnImg.naturalWidth > 0;

                    const boxW = 720 * sc;
                    const boxH = 122 * sc;
                    const boxX = (W - boxW) * 0.5;
                    const boxY = H * 0.49 + yShift + 42 * sc;

                    ctx.save();
                    ctx.shadowColor = 'rgba(2, 6, 23, 0.72)';
                    ctx.shadowBlur = 28 * sc;
                    roundRectPath(ctx, boxX, boxY, boxW, boxH, 24 * sc);
                    const grad = ctx.createLinearGradient(boxX, boxY, boxX + boxW, boxY + boxH);
                    grad.addColorStop(0, 'rgba(10, 22, 46, 0.80)');
                    grad.addColorStop(1, 'rgba(6, 14, 30, 0.86)');
                    ctx.fillStyle = grad;
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(125, 211, 252, 0.34)';
                    ctx.lineWidth = 1.5 * sc;
                    ctx.stroke();

                    // Два вертикальных световых разделителя (Газпром | Сахалинская Энергия | Роснефть)
                    const div1X = boxX + 252 * sc;
                    const div2X = boxX + 432 * sc;
                    [div1X, div2X].forEach(dx => {
                        const divGrad = ctx.createLinearGradient(dx, boxY + 18 * sc, dx, boxY + boxH - 18 * sc);
                        divGrad.addColorStop(0, 'rgba(148, 163, 184, 0)');
                        divGrad.addColorStop(0.5, 'rgba(148, 163, 184, 0.45)');
                        divGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
                        ctx.strokeStyle = divGrad;
                        ctx.lineWidth = 1.5 * sc;
                        ctx.beginPath();
                        ctx.moveTo(dx, boxY + 18 * sc);
                        ctx.lineTo(dx, boxY + boxH - 18 * sc);
                        ctx.stroke();
                    });

                    // Левая секция: Газпром
                    if (gpReady) {
                        const gpH = 68 * sc;
                        const gpW = gpH * (gpImg.naturalWidth / gpImg.naturalHeight);
                        const gpX = boxX + (div1X - boxX - gpW) * 0.5;
                        const gpY = boxY + (boxH - gpH) * 0.5;
                        ctx.drawImage(gpImg, gpX, gpY, gpW, gpH);
                    }

                    // Центральная секция: Сахалинская Энергия
                    if (seReady) {
                        const seSz = 82 * sc;
                        const seX = div1X + (div2X - div1X - seSz) * 0.5;
                        const seY = boxY + (boxH - seSz) * 0.5;
                        ctx.drawImage(seImg, seX, seY, seSz, seSz);
                    }

                    // Правая секция: Роснефть
                    if (rnReady) {
                        const rnH = 66 * sc;
                        const rnW = rnH * (rnImg.naturalWidth / rnImg.naturalHeight);
                        const rnX = div2X + ((boxX + boxW) - div2X - rnW) * 0.5;
                        const rnY = boxY + (boxH - rnH) * 0.5;
                        ctx.drawImage(rnImg, rnX, rnY, rnW, rnH);
                    }
                    ctx.restore();

                    // Аккуратный финальный титр автора под плашкой партнёров
                    if (to.authorLabel) {
                        ctx.fillStyle = 'rgba(203, 213, 225, 0.80)';
                        ctx.font = `600 ${Math.round(14.5 * sc)}px Inter, Segoe UI, sans-serif`;
                        ctx.fillText(to.authorLabel, W * 0.5, boxY + boxH + 34 * sc);
                    }
                }
            }
            ctx.restore();
        }

        // Мягкое затемнение старта/финала
        let blackAlpha = 0;
        if (t < 0.85) blackAlpha = 1 - t / 0.85;
        else if (t > TOTAL_DURATION - 1.7) blackAlpha = (t - (TOTAL_DURATION - 1.7)) / 1.7;
        if (blackAlpha > 0.01) {
            ctx.fillStyle = `rgba(2, 6, 23, ${Math.min(1, Math.max(0, blackAlpha))})`;
            ctx.fillRect(0, 0, W, H);
        }
    }

    // =========================================================================
    // 4. ОДНОПРОХОДНЫЙ ЗАХВАТ И ГЛУБОКИЙ ПРОГРЕВ ВСЕХ ШЕЙДЕРОВ (0 фризов!)
    // =========================================================================
    function copyHotWebGLToRecorder(srcWebGL) {
        if (!cin.running || !cin.recording || !cin.recCtx || !srcWebGL) return;
        const W = cin.recCanvas.width;
        const H = cin.recCanvas.height;
        cin.recCtx.fillStyle = '#020617';
        cin.recCtx.fillRect(0, 0, W, H);

        const sw = srcWebGL.width || W;
        const sh = srcWebGL.height || H;
        const scale = Math.max(W / sw, H / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        cin.recCtx.drawImage(srcWebGL, (W - dw) * 0.5, (H - dh) * 0.5, dw, dh);
        drawCinematicOverlays(cin.recCtx, W, H, cin.elapsed);
    }

    function installSinglePassRenderHooks() {
        if (!cin.hookedMainRender && typeof renderer !== 'undefined' && renderer && typeof renderer.render === 'function') {
            const origRender = renderer.render.bind(renderer);
            renderer.render = function (sc, cam) {
                origRender(sc, cam);
                if (cin.running && !isGlobeIntroActive && cin.recording) {
                    copyHotWebGLToRecorder(renderer.domElement);
                }
            };
            cin.hookedMainRender = true;
        }
        if (!cin.hookedGlobeRender && typeof globeIntro !== 'undefined' && globeIntro.renderer && typeof globeIntro.renderer.render === 'function') {
            const origGlobeRender = globeIntro.renderer.render.bind(globeIntro.renderer);
            globeIntro.renderer.render = function (sc, cam) {
                origGlobeRender(sc, cam);
                if (cin.running && isGlobeIntroActive && cin.recording) {
                    copyHotWebGLToRecorder(globeIntro.renderer.domElement);
                }
            };
            cin.hookedGlobeRender = true;
        }
    }

    // Принудительно прогреваем ВСЕ скрытые группы (зима, лёд, подводный X-Ray, ночные огни, материк),
    // чтобы Three.js скомпилировал их шейдеры ДО начала записи и не давал микрофризов в полёте
    function prewarmAllScenes() {
        if (cin.warmedUp) return;
        cin.warmedUp = true;
        try {
            if (typeof ensureSakhalin1Built === 'function') ensureSakhalin1Built();
            if (typeof showBackgroundProjects !== 'undefined') showBackgroundProjects = true;
            if (typeof snapProjectCrossfade === 'function') snapProjectCrossfade(false);

            if (typeof renderer !== 'undefined' && renderer && scene && camera) {
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

                const hiddenList = [];
                scene.traverse(obj => {
                    if (!obj.visible && !(obj.material && obj.material.visible === false)) {
                        hiddenList.push(obj);
                        obj.visible = true;
                    }
                });
                renderer.compile(scene, camera);
                for (let i = 0; i < hiddenList.length; i++) {
                    hiddenList[i].visible = false;
                }
            }
            if (typeof globeIntro !== 'undefined' && globeIntro.renderer) {
                globeIntro.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
            }
        } catch (err) {
            console.warn('Prewarm note:', err);
        }
    }

    function startVideoRecording() {
        const is720 = (cin.quality === '720p');
        const targetW = is720 ? 1280 : 1920;
        const targetH = is720 ? 720 : 1080;

        if (!cin.recCanvas) {
            cin.recCanvas = document.createElement('canvas');
        }
        cin.recCanvas.width = targetW;
        cin.recCanvas.height = targetH;
        cin.recCtx = cin.recCanvas.getContext('2d', { alpha: false });
        cin.chunks = [];

        ensureCinAudioGraph();
        const videoStream = cin.recCanvas.captureStream(30);
        const tracks = [...videoStream.getVideoTracks()];
        if (cin.audioDest && cin.audioDest.stream) {
            cin.audioDest.stream.getAudioTracks().forEach(tr => tracks.push(tr));
        }

        const combinedStream = new MediaStream(tracks);
        const candidates = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm'
        ];
        let chosenMime = '';
        for (let i = 0; i < candidates.length; i++) {
            if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidates[i])) {
                chosenMime = candidates[i];
                break;
            }
        }
        const isMp4 = chosenMime.startsWith('video/mp4');
        cin.lastFileName = isMp4 ? 'Sakhalin_3D_Cinematic.mp4' : 'Sakhalin_3D_Cinematic.webm';

        const bitrate = is720 ? 6500000 : 10500000;
        const opts = chosenMime ? { mimeType: chosenMime, videoBitsPerSecond: bitrate } : { videoBitsPerSecond: bitrate };

        cin.recorder = new MediaRecorder(combinedStream, opts);
        cin.recorder.ondataavailable = e => {
            if (e.data && e.data.size > 0) cin.chunks.push(e.data);
        };
        cin.recorder.onstop = () => {
            const blob = new Blob(cin.chunks, { type: chosenMime || 'video/webm' });
            if (cin.lastBlobUrl) URL.revokeObjectURL(cin.lastBlobUrl);
            cin.lastBlobUrl = URL.createObjectURL(blob);
            triggerDownload(cin.lastBlobUrl, cin.lastFileName);
            showFinishedOverlay(blob.size);
        };
        cin.recorder.start(300);
        cin.recording = true;
    }

    function stopVideoRecording() {
        cin.recording = false;
        if (cin.recorder && cin.recorder.state !== 'inactive') {
            try { cin.recorder.stop(); } catch (_) {}
        }
    }

    function triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Мгновенный чистый возврат к 3D-планете при повторном запуске синематика
    function resetGlobeForCinematicStart() {
        const overlay = document.getElementById('globe-intro-overlay');
        const veil = document.getElementById('globe-warp-veil');
        if (typeof globeIntro !== 'undefined' && globeIntro.initialized && overlay) {
            const pose = typeof computeGlobeBaseCamPose === 'function'
                ? computeGlobeBaseCamPose(window.innerWidth, window.innerHeight)
                : { dist: 27, lookY: 0 };
            globeIntro.diving = false;
            globeIntro.pullingOut = false;
            globeIntro.mapRevealed = false;
            globeIntro.diveProgress = 0;
            globeIntro.baseCamDist = pose.dist;
            globeIntro.camDist = pose.dist;
            globeIntro.baseLookAtY = pose.lookY;
            globeIntro.lookAtY = pose.lookY;
            if (globeIntro.camera) {
                globeIntro.camera.fov = 42;
                globeIntro.camera.updateProjectionMatrix();
            }
            if (typeof computeTargetAnglesForSakhalin === 'function') {
                const a = computeTargetAnglesForSakhalin();
                globeIntro.rotY = a.rotY - 0.24;
                globeIntro.rotX = a.rotX;
            }
            globeIntro.snappingToSakhalin = false;
            globeIntro.emblemElapsed = 0;
            globeIntro.coreAlpha = 0;
            globeIntro.coreTouched = false;
            globeIntro.coreIdleTimer = 99;
            globeIntro.cinematicForceHideCore = false;
            isGlobeIntroActive = true;
            if (veil) veil.style.opacity = '0';
            overlay.classList.remove('intro-hidden', 'intro-diving');
            if (typeof startGlobeLoop === 'function') startGlobeLoop();
        }
    }

    // =========================================================================
    // 5. ГЛАВНЫЙ ЦИКЛ СИНЕМАТИКА
    // =========================================================================
    function syncViewCanvasSize() {
        if (!cin.viewCanvas) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (cin.viewCanvas.width !== w || cin.viewCanvas.height !== h) {
            cin.viewCanvas.width = w;
            cin.viewCanvas.height = h;
        }
    }

    function updateProgressBarUI(t) {
        const pct = Math.min(100, Math.max(0, (t / TOTAL_DURATION) * 100));
        const fill = document.getElementById('cin-progress-fill');
        if (fill) fill.style.width = pct.toFixed(2) + '%';
        const thumb = document.getElementById('cin-progress-thumb');
        if (thumb) thumb.style.left = pct.toFixed(2) + '%';
        const timeEl = document.getElementById('cin-time-label');
        if (timeEl) {
            const curS = Math.floor(t);
            const curM = Math.floor(curS / 60);
            const curRem = curS % 60;
            const totM = Math.floor(TOTAL_DURATION / 60);
            const totRem = Math.floor(TOTAL_DURATION) % 60;
            timeEl.textContent = `${curM}:${String(curRem).padStart(2, '0')} / ${totM}:${String(totRem).padStart(2, '0')}`;
        }
    }

    function seekCinematicTo(targetT) {
        if (!cin.running) return;
        const t = Math.max(0, Math.min(TOTAL_DURATION - 0.05, targetT));
        const en = (cin.lang === 'en');

        cin.elapsed = t;
        cin.firedEvents.clear();
        cin.activeCard = null;
        cin.clickRipple = null;
        cin.titleOverlay = null;
        cin.flareSweep = null;

        if (typeof highlightPipelineChain === 'function') highlightPipelineChain(null);

        if (t < 6.95) {
            // Возвращаемся на 3D-глобус
            cin.mapSplineReady = false;
            resetGlobeForCinematicStart();
            if (typeof isSubseaMode !== 'undefined' && isSubseaMode && typeof toggleSubseaMode === 'function') {
                toggleSubseaMode(false);
            }
            if (typeof activeProject !== 'undefined' && activeProject !== 'sakhalin2' && typeof switchProjectTab === 'function') {
                switchProjectTab('sakhalin2');
            }
            if (typeof setWeatherMode === 'function') setWeatherMode(0, true);
            if (typeof setWorldCloudsAperture === 'function') {
                setWorldCloudsAperture('open', { duration: 0.15 });
            }
            processTimelineEvents(t);
        } else {
            // Сразу на 3D-карту в нужную точку сплайна
            const overlay = document.getElementById('globe-intro-overlay');
            const veil = document.getElementById('globe-warp-veil');
            if (typeof isGlobeIntroActive !== 'undefined') isGlobeIntroActive = false;
            if (typeof globeIntro !== 'undefined') {
                globeIntro.diving = false;
                globeIntro.pullingOut = false;
                globeIntro.mapRevealed = true;
            }
            if (overlay) {
                overlay.classList.add('intro-hidden');
                overlay.classList.remove('intro-diving');
            }
            if (veil) veil.style.opacity = '0';

            if (typeof showBackgroundProjects !== 'undefined') showBackgroundProjects = true;
            if (typeof areLabelsVisible !== 'undefined') areLabelsVisible = false;
            if (typeof cameraTransition !== 'undefined') cameraTransition.active = false;
            if (typeof controls !== 'undefined' && controls) {
                controls.enabled = false;
                controls.enableDamping = false;
            }

            if (!trackNodes || !cin.camPosCurve) {
                buildSmoothCameraSplines(new THREE.Vector3(85, 132, 105), new THREE.Vector3(4, 0, 8), 6.95);
            }
            cin.mapSplineReady = true;

            // Помечаем уже пройденные события, чтобы они не срабатывали повторно
            const eventTimes = [
                ['intro-title', 0], ['cin-hide-core', 3.0], ['globe-dive', 6.2],
                ['stage-north-alive', 7.8], ['click-pab', 9.4], ['click-paa', 13.6],
                ['click-luna', 17.8], ['click-obtk', 21.8], ['stage-aniva-ships', 27.5],
                ['click-prig', 29.2], ['s1-winter', 38.6], ['click-chayvo', 41.2],
                ['click-berkut', 45.2], ['stage-dekastri-tanker', 49.4], ['click-dekastri', 50.4],
                ['s3-subsea', 56.6], ['click-pdk', 58.6], ['shv-snow', 65.4],
                ['click-khab', 69.2], ['finale-night', 73.8],
                ['close-clouds-finale', 82.2], ['outro-title', 83.8]
            ];
            for (let i = 0; i < eventTimes.length; i++) {
                if (t >= eventTimes[i][1]) cin.firedEvents.add(eventTimes[i][0]);
            }

            // Выставляем проект, погоду, подводный режим и главу строго для времени t
            if (t < 38.6) {
                if (typeof isSubseaMode !== 'undefined' && isSubseaMode && typeof toggleSubseaMode === 'function') toggleSubseaMode(false);
                if (typeof switchProjectTab === 'function' && activeProject !== 'sakhalin2') switchProjectTab('sakhalin2');
                if (typeof setWeatherMode === 'function') setWeatherMode(0, true);
                cin.activeChapter = (t < 29.2)
                    ? { tag: en ? 'SUMMER • DAY  |  SAKHALIN-2' : 'ЛЕТО • ДЕНЬ  |  ПРОЕКТ «САХАЛИН-2»', title: en ? 'Northern Offshore Platforms & 800 km System' : 'Северный шельф и 800-км система', accent: '#10b981' }
                    : { tag: en ? 'SUMMER • DAY  |  ANIVA BAY' : 'ЛЕТО • ДЕНЬ  |  ЗАЛИВ АНИВА', title: en ? 'Prigorodnoye Complex: LNG Plant, OET & Tankers' : 'ПК «Пригородное»: завод СПГ, ТОН и флот', accent: '#10b981' };
            } else if (t < 56.6) {
                if (typeof isSubseaMode !== 'undefined' && isSubseaMode && typeof toggleSubseaMode === 'function') toggleSubseaMode(false);
                if (typeof switchProjectTab === 'function' && activeProject !== 'sakhalin1') switchProjectTab('sakhalin1');
                if (typeof setWeatherMode === 'function') setWeatherMode(1, true);
                if (t >= 49.4 && typeof s1MovingShips !== 'undefined') {
                    stageShip(s1MovingShips, 's1-tanker-dekastri', 0.035);
                }
                cin.activeChapter = { tag: en ? 'SNOW • DAY  |  SAKHALIN-1' : 'СНЕГ • ДЕНЬ  |  ПРОЕКТ «САХАЛИН-1»', title: en ? 'Chayvo, Orlan, Berkut & De-Kastri Ice Export' : 'Чайво, «Орлан», «Беркут» и Де-Кастри', accent: '#f97316' };
            } else if (t < 65.4) {
                if (typeof switchProjectTab === 'function' && activeProject !== 'sakhalin3') switchProjectTab('sakhalin3');
                if (typeof setWeatherMode === 'function') setWeatherMode(0, true);
                if (typeof startMainlandFade === 'function') startMainlandFade(true, 0.25);
                cin.activeChapter = { tag: en ? 'SUMMER • SUBSEA X-RAY  |  SAKHALIN-3' : 'ЛЕТО • ПОДВОДНЫЙ X-RAY  |  ПРОЕКТ «САХАЛИН-3»', title: en ? 'Kirinsky Block — 100% Seabed Gas Production' : 'Киринский блок — 100% подводная добыча газа', accent: '#38bdf8' };
            } else if (t < 73.8) {
                if (typeof switchProjectTab === 'function' && activeProject !== 'shv') switchProjectTab('shv');
                if (typeof setWeatherMode === 'function') setWeatherMode(1, true);
                cin.activeChapter = { tag: en ? 'SNOW • DAY  |  SHV GAS TRUNKLINE' : 'СНЕГ • ДЕНЬ  |  МГП СХВ (> 1 820 КМ)', title: en ? 'Sakhalin – Khabarovsk – Vladivostok' : 'Сахалин — Хабаровск — Владивосток', accent: '#ef4444' };
            } else {
                if (typeof switchProjectTab === 'function' && activeProject !== 'shv') switchProjectTab('shv');
                if (typeof setWeatherMode === 'function') setWeatherMode(2, true);
                cin.activeChapter = { tag: en ? 'SNOW • NIGHT  |  SHV & FINALE' : 'СНЕГ • НОЧЬ  |  МГП СХВ • ФИНАЛ', title: en ? 'Vladivostok & Sakhalin Island Panorama' : 'Владивосток и панорама острова Сахалин', accent: '#ef4444' };
            }
            if (typeof cameraTransition !== 'undefined') cameraTransition.active = false;

            // Облака финала
            if (typeof setWorldCloudsAperture === 'function') {
                if (t >= 82.2) {
                    setWorldCloudsAperture('closed', { centerX: finalCloudCenter.x, centerZ: finalCloudCenter.z, duration: Math.max(0.25, 88.0 - t) });
                } else {
                    setWorldCloudsAperture('open', { duration: 0.2 });
                }
            }

            // Восстанавливаем активную карточку, если перемотали внутрь её окна
            const cardWindows = [
                ['pa-b', '#10b981', 9.4, 13.2],
                ['pa-a', '#10b981', 13.6, 17.4],
                ['lun-a', '#10b981', 17.8, 21.4],
                ['obtk', '#10b981', 21.8, 25.6],
                ['lng-plant', '#10b981', 29.2, 36.2],
                ['s1-chayvo', '#f97316', 41.2, 44.8],
                ['s1-berkut', '#f97316', 45.2, 49.4],
                ['s1-dekastri', '#f97316', 50.4, 55.6],
                ['s3-pdk', '#38bdf8', 58.6, 64.4],
                ['s1-khabarovsk', '#ef4444', 69.2, 73.6]
            ];
            for (let i = 0; i < cardWindows.length; i++) {
                const [id, color, sT, eT] = cardWindows[i];
                if (t >= sT && t <= eT) {
                    triggerVirtualClick(id, color, sT, eT);
                    break;
                }
            }

            // Финальный титр
            if (t >= 83.8) {
                cin.titleOverlay = {
                    top: '',
                    main: en ? 'SAKHALIN & RUSSIAN FAR EAST' : 'САХАЛИН И ДАЛЬНИЙ ВОСТОК',
                    sub: '',
                    partnersLabel: '',
                    authorLabel: en ? 'PTK SakhSU  •  Alexander Chmulev' : 'ПТК СахГУ  •  Александр Чмулев',
                    showPartners: true,
                    startT: 83.9,
                    endT: TOTAL_DURATION
                };
            }

            // Мгновенный перелёт камеры в точку сплайна
            const pose = sampleSmoothCamera(t);
            if (pose && typeof camera !== 'undefined' && camera && typeof controls !== 'undefined' && controls) {
                cin.curPos.copy(pose.pos);
                cin.curTarget.copy(pose.tgt);
                camera.position.copy(pose.pos);
                controls.target.copy(pose.tgt);
                camera.lookAt(pose.tgt);
            }
        }

        // Синхронизация пользовательского MP3 при перемотке
        if (cin.musicMode === 'custom' && cin.customAudioBuffer && cin.audioCtx && cin.musicMaster) {
            if (cin.customAudioSource) {
                try { cin.customAudioSource.stop(); } catch (_) {}
            }
            const src = cin.audioCtx.createBufferSource();
            src.buffer = cin.customAudioBuffer;
            src.loop = true;
            src.connect(cin.musicMaster);
            const offset = t % Math.max(0.1, cin.customAudioBuffer.duration);
            src.start(0, offset);
            cin.customAudioSource = src;
        }

        updateProgressBarUI(t);
    }

    function cinematicTick(ts) {
        if (!cin.running) return;
        requestAnimationFrame(cinematicTick);

        if (!cin.lastTs) cin.lastTs = ts;
        const dt = Math.min(0.033, Math.max(0.004, (ts - cin.lastTs) * 0.001));
        cin.lastTs = ts;

        if (!cin.paused) {
            cin.elapsed += dt;
            processTimelineEvents(cin.elapsed);

            if (typeof isGlobeIntroActive !== 'undefined' && isGlobeIntroActive && typeof globeIntro !== 'undefined' && !globeIntro.diving) {
                globeIntro.rotY += dt * 0.14;
            }

            if (cin.mapSplineReady && typeof camera !== 'undefined' && camera && typeof controls !== 'undefined' && controls) {
                if (typeof cameraTransition !== 'undefined') cameraTransition.active = false;
                const pose = sampleSmoothCamera(cin.elapsed);
                if (pose) {
                    const smooth = 1.0 - Math.exp(-dt * 5.0);
                    cin.curPos.lerp(pose.pos, smooth);
                    cin.curTarget.lerp(pose.tgt, smooth);
                    camera.position.copy(cin.curPos);
                    controls.target.copy(cin.curTarget);
                    camera.lookAt(cin.curTarget);
                }
            }

            updateProgressBarUI(cin.elapsed);

            if (cin.elapsed >= TOTAL_DURATION) {
                finishCinematic();
                return;
            }
        }

        if (cin.viewCanvas && cin.viewCtx) {
            syncViewCanvasSize();
            cin.viewCtx.clearRect(0, 0, cin.viewCanvas.width, cin.viewCanvas.height);
            drawCinematicOverlays(cin.viewCtx, cin.viewCanvas.width, cin.viewCanvas.height, cin.elapsed);
        }
    }

    function showFinishedOverlay(blobBytes) {
        const fin = document.getElementById('cin-finish-screen');
        const info = document.getElementById('cin-finish-size');
        const prev = document.getElementById('cin-preview-video');
        const dlBtn = document.getElementById('btn-cin-download-again');
        const resLabel = cin.quality === '720p' ? 'HD 720p' : 'Full HD 1080p';
        if (info && blobBytes) {
            const mb = (blobBytes / (1024 * 1024)).toFixed(1);
            info.textContent = `Видео готово (${mb} МБ, ${resLabel}) • Файл «${cin.lastFileName}» сохранён в Загрузки`;
        } else if (info) {
            info.textContent = 'Просмотр синематика завершён';
        }
        if (prev && cin.lastBlobUrl) {
            prev.src = cin.lastBlobUrl;
            prev.classList.remove('hidden');
        }
        if (dlBtn) dlBtn.classList.toggle('hidden', !cin.lastBlobUrl);
        if (fin) fin.classList.remove('hidden');
    }

    function finishCinematic() {
        cin.running = false;
        if (typeof globeIntro !== 'undefined') globeIntro.cinematicForceHideCore = false;
        stopCinematicMusic();
        if (typeof controls !== 'undefined' && controls) {
            controls.enabled = cin.savedControlsEnabled;
            controls.enableDamping = cin.savedControlsDamping;
        }
        const bar = document.getElementById('cin-live-bar');
        if (bar) bar.classList.add('hidden');
        if (cin.recording) {
            stopVideoRecording();
        } else {
            showFinishedOverlay(0);
        }
    }

    function startCinematic(withRecord) {
        const startScreen = document.getElementById('cin-start-screen');
        const finScreen = document.getElementById('cin-finish-screen');
        const liveBar = document.getElementById('cin-live-bar');
        const recDot = document.getElementById('cin-rec-indicator');
        const stopLbl = document.getElementById('cin-stop-label');

        if (startScreen) startScreen.classList.add('hidden');
        if (finScreen) finScreen.classList.add('hidden');
        if (liveBar) liveBar.classList.remove('hidden');
        if (recDot) recDot.classList.toggle('hidden', !withRecord);
        if (stopLbl) stopLbl.textContent = withRecord ? 'Стоп и скачать видео' : 'Остановить';

        installWorldSoundDucker();
        installCinematicCameraGuards();
        prewarmAllScenes();
        installSinglePassRenderHooks();

        // Сброс к исходному состоянию (3D-Земля + Сахалин-2 летом)
        resetGlobeForCinematicStart();
        if (typeof isSubseaMode !== 'undefined' && isSubseaMode && typeof toggleSubseaMode === 'function') {
            toggleSubseaMode(false);
        }
        if (typeof setLanguage === 'function') setLanguage(cin.lang, true);
        if (typeof setWeatherMode === 'function') setWeatherMode(0, true);
        if (typeof activeProject !== 'undefined' && activeProject !== 'sakhalin2' && typeof switchProjectTab === 'function') {
            switchProjectTab('sakhalin2');
        }
        if (typeof highlightPipelineChain === 'function') highlightPipelineChain(null);
        if (typeof areLabelsVisible !== 'undefined') areLabelsVisible = false;

        cin.elapsed = 0;
        cin.lastTs = 0;
        cin.paused = false;
        cin.mapSplineReady = false;
        cin.mapEnterT = 6.95;
        cin.firedEvents.clear();
        cin.activeCard = null;
        cin.activeChapter = null;
        cin.clickRipple = null;
        cin.titleOverlay = null;
        trackNodes = null;
        cin.camPosCurve = null;
        cin.camTgtCurve = null;
        cin.running = true;

        startCinematicMusic();

        if (withRecord) {
            try {
                startVideoRecording();
            } catch (err) {
                console.error('Recorder start failed:', err);
                alert('Ваш браузер не поддерживает запись видео. Попробуйте Chrome или Edge.');
                cin.recording = false;
            }
        }

        requestAnimationFrame(cinematicTick);
    }

    function setPillActive(ids, activeId) {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const on = (id === activeId);
            el.classList.toggle('bg-emerald-500/25', on);
            el.classList.toggle('text-emerald-300', on);
            el.classList.toggle('border-emerald-400/50', on);
            el.classList.toggle('border-slate-700', !on);
            el.classList.toggle('text-slate-300', !on);
        });
    }

    function initCinematicUI() {
        cin.viewCanvas = document.getElementById('cin-overlay-canvas');
        if (cin.viewCanvas) cin.viewCtx = cin.viewCanvas.getContext('2d');

        // Прогреваем сцену и шейдеры заранее до нажатия Старт
        setTimeout(() => {
            installWorldSoundDucker();
            installCinematicCameraGuards();
            prewarmAllScenes();
        }, 700);

        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', fn);
        };

        bind('btn-cin-record', () => startCinematic(true));
        bind('btn-cin-watch', () => startCinematic(false));
        bind('btn-cin-stop', () => finishCinematic());
        bind('btn-cin-pause', () => {
            cin.paused = !cin.paused;
            const el = document.getElementById('btn-cin-pause');
            if (el) el.textContent = cin.paused ? '▶ Продолжить' : '⏸ Пауза';
        });

        // Перемотка кликом и перетаскиванием по шкале прогресса
        const track = document.getElementById('cin-progress-track');
        if (track) {
            let scrubbing = false;
            const seekFromClientX = (clientX) => {
                const rect = track.getBoundingClientRect();
                if (!rect.width) return;
                const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                seekCinematicTo(ratio * TOTAL_DURATION);
            };
            track.addEventListener('pointerdown', (e) => {
                if (!cin.running) return;
                scrubbing = true;
                try { track.setPointerCapture(e.pointerId); } catch (_) {}
                seekFromClientX(e.clientX);
            });
            track.addEventListener('pointermove', (e) => {
                if (!scrubbing || !cin.running) return;
                seekFromClientX(e.clientX);
            });
            const endScrub = (e) => {
                if (!scrubbing) return;
                scrubbing = false;
                try { track.releasePointerCapture(e.pointerId); } catch (_) {}
            };
            track.addEventListener('pointerup', endScrub);
            track.addEventListener('pointercancel', endScrub);
        }

        // Горячие клавиши: стрелки ←/→ для перемотки на ±5с, пробел — пауза
        window.addEventListener('keydown', (e) => {
            if (!cin.running) return;
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                seekCinematicTo(cin.elapsed + 5);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                seekCinematicTo(cin.elapsed - 5);
            } else if (e.code === 'Space') {
                e.preventDefault();
                cin.paused = !cin.paused;
                const el = document.getElementById('btn-cin-pause');
                if (el) el.textContent = cin.paused ? '▶ Продолжить' : '⏸ Пауза';
            }
        });
        bind('btn-cin-download-again', () => {
            if (cin.lastBlobUrl) triggerDownload(cin.lastBlobUrl, cin.lastFileName);
        });
        bind('btn-cin-replay', () => {
            const startScreen = document.getElementById('cin-start-screen');
            const finScreen = document.getElementById('cin-finish-screen');
            if (finScreen) finScreen.classList.add('hidden');
            if (startScreen) startScreen.classList.remove('hidden');
        });

        bind('cin-lang-ru', () => { cin.lang = 'ru'; setPillActive(['cin-lang-ru', 'cin-lang-en'], 'cin-lang-ru'); });
        bind('cin-lang-en', () => { cin.lang = 'en'; setPillActive(['cin-lang-ru', 'cin-lang-en'], 'cin-lang-en'); });

        bind('cin-qual-1080', () => { cin.quality = '1080p'; setPillActive(['cin-qual-1080', 'cin-qual-720'], 'cin-qual-1080'); });
        bind('cin-qual-720',  () => { cin.quality = '720p';  setPillActive(['cin-qual-1080', 'cin-qual-720'], 'cin-qual-720'); });

        bind('cin-mus-builtin', () => { cin.musicMode = 'builtin'; setPillActive(['cin-mus-builtin', 'cin-mus-off'], 'cin-mus-builtin'); });
        bind('cin-mus-off',     () => { cin.musicMode = 'off';     setPillActive(['cin-mus-builtin', 'cin-mus-off'], 'cin-mus-off'); });

        const fileInp = document.getElementById('cin-custom-mp3');
        if (fileInp) {
            fileInp.addEventListener('change', async e => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                try {
                    const ctx = ensureCinAudioGraph();
                    const arrBuf = await file.arrayBuffer();
                    cin.customAudioBuffer = await ctx.decodeAudioData(arrBuf);
                    cin.musicMode = 'custom';
                    setPillActive(['cin-mus-builtin', 'cin-mus-off'], '');
                    const lbl = document.getElementById('cin-mp3-label');
                    if (lbl) lbl.textContent = '🎵 ' + file.name.slice(0, 22);
                } catch (_) {
                    alert('Не удалось прочитать аудиофайл. Попробуй MP3 или WAV.');
                }
            });
        }
    }

    if (document.readyState !== 'loading') {
        initCinematicUI();
    } else {
        document.addEventListener('DOMContentLoaded', initCinematicUI);
    }
})();
