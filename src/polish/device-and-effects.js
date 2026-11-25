'use strict';

// =========================================================================
// [BLOCK:DEVICE_ADAPT]
// 12. АДАПТАЦИЯ «ОБЗОРА», «ВИДА СВЕРХУ» И ОБНОВЛЕНИЙ ПОД ПК И ТЕЛЕФОН
// =========================================================================
function syncDeviceCameraLimits() {
    if (!controls) return;
    const mobile = isMobileViewport();
    const isWide = (activeProject === 'sakhalin1' || activeProject === 'shv');

    if (isWide) {
        controls.minDistance = mobile ? 26 : 22;
        controls.maxDistance = mobile ? 840 : 680;
    } else {
        controls.minDistance = mobile ? 14 : 12;
        controls.maxDistance = mobile ? 460 : 390;
    }
    controls.zoomSpeed = mobile ? 0.92 : 1.08;
    controls.rotateSpeed = mobile ? 0.68 : 0.82;
}

// Переопределяем getAdaptiveCameraPose с точным расчётом под ПК (с учётом левой панели) и Телефон
getAdaptiveCameraPose = function(isTopDown) {
    const mobile = isMobileViewport();
    const w = viewportWidth || window.innerWidth || 1280;
    const h = viewportHeight || window.innerHeight || 720;
    const aspect = Math.max(0.40, Math.min(2.40, w / Math.max(1, h)));

    if (activeProject === 'sakhalin3') {
        // Проект «Сахалин-3»: близкий, чёткий вид прямо на Киринский блок (БТК, Киринское ПДК и Южно-Киринское)
        if (mobile) {
            const narrowBoost = aspect < 0.60 ? Math.min(1.25, 0.60 / aspect) : 1.0;
            if (isTopDown) {
                return {
                    pos: new THREE.Vector3(11.0, Math.round(52 * narrowBoost), -18.0),
                    target: new THREE.Vector3(11.0, -0.5, -20.0)
                };
            }
            return {
                pos: new THREE.Vector3(31.0, Math.round(25 * narrowBoost), 0.5),
                target: new THREE.Vector3(10.8, -0.8, -20.2)
            };
        } else {
            const wideAdjust = aspect > 1.85 ? 0.94 : (aspect < 1.35 ? 1.08 : 1.0);
            if (isTopDown) {
                return {
                    pos: new THREE.Vector3(8.5, Math.round(44 * wideAdjust), -18.5),
                    target: new THREE.Vector3(8.5, -0.5, -20.2)
                };
            }
            return {
                pos: new THREE.Vector3(Math.round(28 * wideAdjust), Math.round(21 * wideAdjust), -2.5),
                target: new THREE.Vector3(8.2, -0.8, -20.2)
            };
        }
    }

    if (activeProject === 'sakhalin1') {
        // Проект «Сахалин-1»: фокус на северный шельф Сахалина, Чайво и терминал Де-Кастри
        if (mobile) {
            const narrowBoost = aspect < 0.62 ? Math.min(1.30, 0.62 / aspect) : 1.0;
            if (isTopDown) {
                return {
                    pos: new THREE.Vector3(-12, Math.round(165 * narrowBoost), -34),
                    target: new THREE.Vector3(-12, 0, -40)
                };
            }
            return {
                pos: new THREE.Vector3(34, Math.round(86 * narrowBoost), 24),
                target: new THREE.Vector3(-12, 0, -40)
            };
        } else {
            const wideAdjust = aspect > 1.85 ? 0.94 : (aspect < 1.35 ? 1.10 : 1.0);
            if (isTopDown) {
                return {
                    pos: new THREE.Vector3(-20, Math.round(135 * wideAdjust), -34),
                    target: new THREE.Vector3(-20, 0, -40)
                };
            }
            return {
                pos: new THREE.Vector3(Math.round(24 * wideAdjust), Math.round(64 * wideAdjust), Math.round(18 * wideAdjust)),
                target: new THREE.Vector3(-18, 0, -39)
            };
        }
    }

    if (activeProject === 'shv') {
        if (mobile) {
            // Телефон: вертикальный экран, центр между верхней шапкой и нижним доком
            const narrowBoost = aspect < 0.62 ? Math.min(1.36, Math.pow(0.62 / aspect, 0.82)) : 1.0;
            if (isTopDown) {
                return {
                    pos: new THREE.Vector3(-76, Math.round(485 * narrowBoost), 44),
                    target: new THREE.Vector3(-76, 0, 22)
                };
            }
            return {
                pos: new THREE.Vector3(-44, Math.round(350 * narrowBoost), Math.round(282 * narrowBoost)),
                target: new THREE.Vector3(-72, 0, 26)
            };
        } else {
            // ПК: широкоформатный экран + учёт левой боковой панели (сдвигаем target западнее)
            const wideAdjust = aspect > 1.85 ? 0.94 : (aspect < 1.35 ? 1.12 : 1.0);
            if (isTopDown) {
                return {
                    pos: new THREE.Vector3(-114, Math.round(392 * wideAdjust), 40),
                    target: new THREE.Vector3(-114, 0, 16)
                };
            }
            return {
                pos: new THREE.Vector3(-62, Math.round(242 * wideAdjust), Math.round(252 * wideAdjust)),
                target: new THREE.Vector3(-110, 0, 18)
            };
        }
    } else {
        // Проект «Сахалин-2»
        if (mobile) {
            // Телефон: вытянутый о. Сахалин идеально ложится по вертикали между шапкой и доком
            const narrowBoost = aspect < 0.60 ? Math.min(1.26, 0.60 / aspect) : 1.0;
            if (isTopDown) {
                return {
                    pos: new THREE.Vector3(2, Math.round(286 * narrowBoost), 22),
                    target: new THREE.Vector3(2, 0, 8)
                };
            }
            return {
                pos: new THREE.Vector3(Math.round(112 * narrowBoost), Math.round(176 * narrowBoost), Math.round(162 * narrowBoost)),
                target: new THREE.Vector3(-2, 0, 6)
            };
        } else {
            // ПК: смещаем target чуть западнее, чтобы остров визуально стоял по центру свободной области справа от сайдбара
            const wideAdjust = aspect > 1.85 ? 0.94 : (aspect < 1.35 ? 1.10 : 1.0);
            if (isTopDown) {
                return {
                    pos: new THREE.Vector3(-24, Math.round(246 * wideAdjust), 20),
                    target: new THREE.Vector3(-24, 0, 6)
                };
            }
            return {
                pos: new THREE.Vector3(Math.round(118 * wideAdjust), Math.round(138 * wideAdjust), Math.round(128 * wideAdjust)),
                target: new THREE.Vector3(-18, 0, 4)
            };
        }
    }
};

// =========================================================================
// [BLOCK:GOLD_MASTER]
// 13. ФИНАЛЬНАЯ ШЛИФОВКА (GOLD MASTER v19)
//     Снегопад, шкала масштаба (км), кильватер судов + ходовые огни,
//     кино-режим, горячие клавиши ПК, подсказка управления, прогрев шейдеров
// =========================================================================
const goldMaster = {
    initialized: false,
    cinemaMode: false,
    hintShown: false,
    hintTimer: 0,
    // Зимний снегопад
    snowPoints: null,
    snowMat: null,
    snowData: null,
    snowCount: 0,
    // Шкала масштаба (км)
    unitsPerKm: 0.25,
    scaleAccum: 0,
    // Автопоиск движущихся судов для кильватерного следа и ночных ходовых огней
    shipScanAccum: 0,
    shipCandidates: new WeakMap(),
    shipTrackers: [],
    wakeTex: null,
    navGlowTex: null,
    // Фоновый прогрев Сахалин-1
    warmedUp: false
};

function createSoftCircleTex(innerColor, midColor, outerColor, size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const half = size * 0.5;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0.0, innerColor);
    g.addColorStop(0.42, midColor);
    g.addColorStop(1.0, outerColor);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
}

function createShipWakeTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 256);

    // Мягкая V-образная пена кильватера: сверху (y=0) корма судна, вниз (y=256) расходящийся след
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(235, 248, 255, 0.85)');
    grad.addColorStop(0.35, 'rgba(204, 236, 255, 0.45)');
    grad.addColorStop(0.75, 'rgba(186, 230, 253, 0.14)');
    grad.addColorStop(1.0, 'rgba(186, 230, 253, 0.0)');

    // Центральная струя винта
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(58, 4);
    ctx.lineTo(70, 4);
    ctx.lineTo(84, 240);
    ctx.lineTo(44, 240);
    ctx.closePath();
    ctx.fill();

    // Две расходящиеся боковые волны V-следа
    ctx.strokeStyle = grad;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(60, 8);
    ctx.quadraticCurveTo(36, 118, 12, 246);
    ctx.moveTo(68, 8);
    ctx.quadraticCurveTo(92, 118, 116, 246);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
}

// 1) 3D-снегопад в зимнем режиме
function buildWinterSnowfall() {
    const count = isMobileViewport() ? 720 : 1150;
    goldMaster.snowCount = count;

    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const offsetsX = new Float32Array(count);
    const offsetsZ = new Float32Array(count);

    let s = 314159;
    function rnd() {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    }

    for (let i = 0; i < count; i++) {
        offsetsX[i] = (rnd() - 0.5) * 2.0; // нормализовано [-1..1]
        offsetsZ[i] = (rnd() - 0.5) * 2.0;
        positions[i * 3] = offsetsX[i] * 120;
        positions[i * 3 + 1] = rnd() * 95;
        positions[i * 3 + 2] = offsetsZ[i] * 120;
        speeds[i] = 5.5 + rnd() * 7.5;
        phases[i] = rnd() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const snowTex = createSoftCircleTex(
        'rgba(255,255,255,0.95)',
        'rgba(226,242,255,0.55)',
        'rgba(226,242,255,0.0)',
        32
    );

    goldMaster.snowMat = new THREE.PointsMaterial({
        map: snowTex,
        color: 0xf0f8ff,
        size: isMobileViewport() ? 1.55 : 1.35,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.0,
        depthWrite: false
    });

    goldMaster.snowPoints = new THREE.Points(geo, goldMaster.snowMat);
    goldMaster.snowPoints.visible = false;
    goldMaster.snowPoints.frustumCulled = false;
    goldMaster.snowData = { positions, speeds, phases, offsetsX, offsetsZ, heightSpan: 95 };
    scene.add(goldMaster.snowPoints);
}

function updateWinterSnowfall(dt, elapsed) {
    if (!goldMaster.snowPoints || !goldMaster.snowMat || !camera || !controls) return;
    const wMix = (typeof winterMix !== 'undefined') ? winterMix : (isWinterMode ? 1.0 : 0.0);
    const showSnow = (isWinterMode || wMix > 0.02) && !isGlobeIntroActive;
    if (!showSnow) {
        if (goldMaster.snowPoints.visible) {
            goldMaster.snowMat.opacity = Math.max(0, goldMaster.snowMat.opacity - dt * 1.15);
            if (goldMaster.snowMat.opacity <= 0.008) {
                goldMaster.snowPoints.visible = false;
            }
        }
        return;
    }

    goldMaster.snowPoints.visible = true;
    const camDist = camera.position.distanceTo(controls.target);
    // Снег идёт ПОД облаками: плавно убираем его, когда камера поднимается выше облачного слоя или облака смыкаются
    const cloudCover = (typeof worldClouds !== 'undefined' && typeof worldClouds.curClosed === 'number') ? worldClouds.curClosed : 0;
    const cloudFade = Math.max(0, 1.0 - cloudCover * 1.45);
    const altFade = camera.position.y > 105 ? Math.max(0, 1.0 - (camera.position.y - 105) / 65) : 1.0;
    const distFade = camDist > 380 ? Math.max(0.0, 1.0 - (camDist - 380) / 260) : 1.0;
    const smoothW = wMix * wMix * (3.0 - 2.0 * wMix);
    const targetOp = (0.76 - nightMix * 0.16) * distFade * altFade * cloudFade * smoothW;
    goldMaster.snowMat.opacity += (targetOp - goldMaster.snowMat.opacity) * Math.min(1, dt * 2.4);
    if (goldMaster.snowMat.opacity <= 0.008 && targetOp <= 0.008) {
        goldMaster.snowPoints.visible = false;
        return;
    }
    goldMaster.snowMat.color.setHex(nightMix > 0.5 ? 0xc7ddf5 : 0xf2f8ff);

    const spread = Math.max(85, Math.min(250, camDist * 0.90));
    const heightSpan = Math.max(38, Math.min(95, camDist * 0.55));
    const cx = controls.target.x;
    const cz = controls.target.z;

    const data = goldMaster.snowData;
    const pos = data.positions;
    const count = goldMaster.snowCount;

    for (let i = 0; i < count; i++) {
        const j = i * 3;
        let y = pos[j + 1] - data.speeds[i] * dt * (heightSpan / 95);
        if (y < 0.2 || y > heightSpan) {
            y = heightSpan - (Math.abs(y) % heightSpan);
        }
        const swayX = Math.sin(elapsed * 0.9 + data.phases[i]) * 2.4;
        const swayZ = Math.cos(elapsed * 0.75 + data.phases[i]) * 2.0;
        pos[j] = cx + data.offsetsX[i] * spread + swayX;
        pos[j + 1] = y;
        pos[j + 2] = cz + data.offsetsZ[i] * spread + swayZ;
    }
    goldMaster.snowPoints.geometry.attributes.position.needsUpdate = true;
}

// 2) Динамическая шкала масштаба (в километрах)
const _scaleP1 = new THREE.Vector3();
const _scaleP2 = new THREE.Vector3();
const _scaleRight = new THREE.Vector3();
const SCALE_NICE_STEPS_KM = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

function initScaleCalibration() {
    if (typeof lonLatToXZ === 'function') {
        const [x1, z1] = lonLatToXZ(142.8, 50.0);
        const [x2, z2] = lonLatToXZ(142.8, 51.0);
        const dist1Deg = Math.hypot(x2 - x1, z2 - z1);
        if (dist1Deg > 0.01) {
            // 1 градус широты = 111.2 км
            goldMaster.unitsPerKm = dist1Deg / 111.2;
        }
    }
}

function updateDynamicScaleBar(dt) {
    goldMaster.scaleAccum += dt;
    if (goldMaster.scaleAccum < 0.10) return;
    goldMaster.scaleAccum = 0;

    if (!camera || !controls || isGlobeIntroActive || goldMaster.cinemaMode) return;
    const lineEl = document.getElementById('map-scale-line');
    const labelEl = document.getElementById('map-scale-label');
    if (!lineEl || !labelEl) return;

    const w = viewportWidth || window.innerWidth;
    const h = viewportHeight || window.innerHeight;
    _scaleP1.set(controls.target.x, 0, controls.target.z);
    _scaleRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    _scaleRight.y = 0;
    if (_scaleRight.lengthSq() < 0.001) _scaleRight.set(1, 0, 0);
    _scaleRight.normalize();

    const sampleUnits = 10.0;
    _scaleP2.copy(_scaleP1).addScaledVector(_scaleRight, sampleUnits);
    _scaleP1.project(camera);
    _scaleP2.project(camera);

    const sx1 = (_scaleP1.x * 0.5 + 0.5) * w;
    const sy1 = (-_scaleP1.y * 0.5 + 0.5) * h;
    const sx2 = (_scaleP2.x * 0.5 + 0.5) * w;
    const sy2 = (-_scaleP2.y * 0.5 + 0.5) * h;
    const pxPerUnit = Math.hypot(sx2 - sx1, sy2 - sy1) / sampleUnits;
    const pxPerKm = pxPerUnit * goldMaster.unitsPerKm;
    if (!isFinite(pxPerKm) || pxPerKm <= 0.0001) return;

    let bestKm = 50;
    let bestPx = 80;
    for (let i = 0; i < SCALE_NICE_STEPS_KM.length; i++) {
        const km = SCALE_NICE_STEPS_KM[i];
        const px = km * pxPerKm;
        bestKm = km;
        bestPx = px;
        if (px >= 54 && px <= 122) break;
        if (px > 122) {
            if (i > 0) {
                bestKm = SCALE_NICE_STEPS_KM[i - 1];
                bestPx = bestKm * pxPerKm;
            }
            break;
        }
    }

    const clampedPx = Math.max(40, Math.min(138, Math.round(bestPx)));
    lineEl.style.width = clampedPx + 'px';
    const kmUnit = (typeof isEn === 'function' && isEn()) ? ' km' : ' км';
    labelEl.textContent = bestKm + kmUnit;
}

// 3) Кильватерный след на воде за судами + ночные ходовые огни (авто-привязка к плывущим судам)
function attachWakeAndLightsToShip(shipObj) {
    if (!goldMaster.wakeTex) goldMaster.wakeTex = createShipWakeTexture();
    if (!goldMaster.navGlowTex) {
        goldMaster.navGlowTex = createSoftCircleTex(
            'rgba(255,250,210,1.0)',
            'rgba(251,191,36,0.65)',
            'rgba(251,191,36,0.0)',
            64
        );
    }

    // Группа кильватерного следа живёт в том же родителе, чтобы автоматически скрываться/фейдиться вместе с проектом
    const parentObj = shipObj.parent || scene;
    const wakeGeo = new THREE.PlaneGeometry(3.2, 10.5);
    wakeGeo.rotateX(-Math.PI / 2);
    // Смещаем полосу назад от кормы судна (+Z в локальных координатах следа)
    wakeGeo.translate(0, 0, 5.4);

    const wakeMat = new THREE.MeshBasicMaterial({
        map: goldMaster.wakeTex,
        color: 0xe6f6ff,
        transparent: true,
        opacity: 0.62,
        depthWrite: false
    });
    const wakeMesh = new THREE.Mesh(wakeGeo, wakeMat);
    wakeMesh.renderOrder = 2;
    parentObj.add(wakeMesh);

    // Тёплый ночной ходовой огонёк на мачте / мостике судна
    const navMat = new THREE.SpriteMaterial({
        map: goldMaster.navGlowTex,
        color: 0xffe49c,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    const navSprite = new THREE.Sprite(navMat);
    navSprite.scale.set(2.4, 2.4, 1);
    parentObj.add(navSprite);

    goldMaster.shipTrackers.push({
        ship: shipObj,
        wakeMesh,
        wakeMat,
        navSprite,
        navMat,
        prevX: shipObj.position.x,
        prevZ: shipObj.position.z,
        heading: 0
    });
}

function scanAndUpdateShipWakes(dt, elapsed) {
    goldMaster.shipScanAccum += dt;
    // Периодически проверяем движущиеся морские группы-суда в обеих вкладках (чтобы подхватить и S1 после сборки)
    if (goldMaster.shipScanAccum > 0.75) {
        goldMaster.shipScanAccum = 0;
        const roots = [sakhalin2Group, sakhalin1Group];
        for (let r = 0; r < roots.length; r++) {
            const root = roots[r];
            if (!root || !root.visible) continue;
            for (let i = 0; i < root.children.length; i++) {
                const child = root.children[i];
                if (!child || !child.isGroup || !child.visible) continue;
                if (child === s1BackdropGroup || child === s1NeighborsGroup || child === s1NauticalGridGroup) continue;
                if (typeof supplyHelicopter !== 'undefined' && supplyHelicopter && child === supplyHelicopter.group) continue;
                if (child.position.y < -0.5 || child.position.y > 1.2) continue;

                const rec = goldMaster.shipCandidates.get(child);
                if (!rec) {
                    goldMaster.shipCandidates.set(child, {
                        x: child.position.x,
                        z: child.position.z,
                        attached: false
                    });
                } else if (!rec.attached) {
                    const moved = Math.hypot(child.position.x - rec.x, child.position.z - rec.z);
                    rec.x = child.position.x;
                    rec.z = child.position.z;
                    // Если 3D-группа на воде плавно перемещается — это судно!
                    if (moved > 0.06 && moved < 35 && getAnyLandElevation(child.position.x, child.position.z) < 0.05) {
                        rec.attached = true;
                        attachWakeAndLightsToShip(child);
                    }
                }
            }
        }
    }

    // Обновляем кильватер и ночные ходовые огни для всех обнаруженных судов
    for (let i = 0; i < goldMaster.shipTrackers.length; i++) {
        const tr = goldMaster.shipTrackers[i];
        const ship = tr.ship;

        // Вычисляем реальную видимость и прозрачность судна (учитываем fadeAlpha цикла, кроссфейд проектов и скрытие материка)
        let effAlpha = 1.0;
        let visible = Boolean(ship && ship.visible && ship.parent && ship.parent.visible);
        if (visible && ship.scale && ship.scale.x < 0.05) visible = false;

        if (visible) {
            // Проверяем принадлежность к movingShips / s1MovingShips для учёта ship.fadeAlpha
            let shipEntry = null;
            if (typeof movingShips !== 'undefined') {
                for (let k = 0; k < movingShips.length; k++) {
                    if (movingShips[k] && movingShips[k].group === ship) { shipEntry = movingShips[k]; break; }
                }
            }
            if (!shipEntry && typeof s1MovingShips !== 'undefined') {
                for (let k = 0; k < s1MovingShips.length; k++) {
                    if (s1MovingShips[k] && s1MovingShips[k].group === ship) { shipEntry = s1MovingShips[k]; break; }
                }
            }
            if (shipEntry && typeof shipEntry.fadeAlpha === 'number') {
                effAlpha *= shipEntry.fadeAlpha;
            }

            // Проверяем видимость всей цепочки родителей и прозрачность проекта (S2 / S1)
            let isInS1 = false;
            let isInS2 = false;
            let p = ship.parent;
            while (p) {
                if (!p.visible) { visible = false; break; }
                if (typeof sakhalin1Group !== 'undefined' && p === sakhalin1Group) isInS1 = true;
                if (typeof sakhalin2Group !== 'undefined' && p === sakhalin2Group) isInS2 = true;
                p = p.parent;
            }
            if (visible && typeof projectCrossfade !== 'undefined') {
                if (isInS2 && typeof projectCrossfade.s2Alpha === 'number') effAlpha *= projectCrossfade.s2Alpha;
                if (isInS1 && typeof projectCrossfade.s1Alpha === 'number') effAlpha *= projectCrossfade.s1Alpha;
            }
            if (visible && isInS1 && typeof mainlandFade !== 'undefined' && typeof mainlandFade.alpha === 'number') {
                effAlpha *= mainlandFade.alpha;
            }
            if (effAlpha <= 0.03) visible = false;
        }

        tr.wakeMesh.visible = visible;
        tr.navSprite.visible = visible && nightMix > 0.04;
        if (!visible) continue;

        const dx = ship.position.x - tr.prevX;
        const dz = ship.position.z - tr.prevZ;
        const step = Math.hypot(dx, dz);
        if (step > 0.002 && step < 25) {
            // Вектор «назад» от движения судна (туда тянется кильватер)
            const backAngle = Math.atan2(-dx, -dz);
            let diff = (backAngle - tr.heading) % (Math.PI * 2);
            if (diff > Math.PI) diff -= Math.PI * 2;
            if (diff < -Math.PI) diff += Math.PI * 2;
            tr.heading += diff * Math.min(1, dt * 8.0);
        }
        tr.prevX = ship.position.x;
        tr.prevZ = ship.position.z;

        const shipScale = Math.max(0.65, Math.min(2.4, ship.scale ? ship.scale.x : 1.0));
        const pulse = 0.94 + Math.sin(elapsed * 3.2 + i * 1.7) * 0.06;
        tr.wakeMesh.position.set(ship.position.x, 0.065, ship.position.z);
        tr.wakeMesh.rotation.y = tr.heading;
        tr.wakeMesh.scale.set(shipScale * pulse, 1, shipScale * (0.95 + Math.sin(elapsed * 2.1 + i) * 0.08));
        tr.wakeMat.opacity = (0.58 - nightMix * 0.22) * effAlpha;

        tr.navSprite.position.set(ship.position.x, ship.position.y + 1.35 * shipScale, ship.position.z);
        tr.navSprite.scale.set(2.5 * shipScale, 2.5 * shipScale, 1);
        tr.navMat.opacity = nightMix * (0.82 + Math.sin(elapsed * 4.0 + i) * 0.14) * effAlpha;
    }
}

// 4) Кино-режим (Чистый экран)
function toggleCinemaMode(forceState) {
    const next = typeof forceState === 'boolean' ? forceState : !goldMaster.cinemaMode;
    goldMaster.cinemaMode = next;
    document.body.classList.toggle('cinema-mode', next);
    const btn = document.getElementById('btn-cinema-mode');
    if (btn) {
        btn.classList.toggle('text-amber-300', next);
        btn.classList.toggle('border-amber-400/70', next);
    }
    if (next) {
        closeDetailCard();
        closeMobileSidebar();
        closeTelemetryPanel();
        if (typeof closeProjectInfoModal === 'function') closeProjectInfoModal();
        if (typeof closeSettingsModal === 'function') closeSettingsModal();
    } else if (typeof showToast === 'function') {
        const en = (typeof isEn === 'function' && isEn());
        showToast(en ? 'Interface restored' : 'Интерфейс возвращён');
    }
}

// 5) Умная подсказка управления при первом влёте с планеты
function showFirstEntryControlsHint() {
    if (goldMaster.hintShown) return;
    try {
        if (sessionStorage.getItem('sakhalin_hint_seen') === '1') {
            goldMaster.hintShown = true;
            return;
        }
        sessionStorage.setItem('sakhalin_hint_seen', '1');
    } catch (_) {}

    goldMaster.hintShown = true;
    const toast = document.getElementById('controls-hint-toast');
    if (!toast) return;

    if (isMobileViewport()) {
        toast.textContent = '1 палец — вращение • 2 пальца — масштаб и сдвиг • Тап по метке — детали';
    } else {
        toast.textContent = 'ЛКМ — вращение • ПКМ — сдвиг • Колёсико — масштаб • H — кино-режим • 1/2 — проекты';
    }

    setTimeout(() => {
        if (!isGlobeIntroActive && !goldMaster.cinemaMode) {
            toast.classList.add('visible');
            clearTimeout(goldMaster.hintTimer);
            goldMaster.hintTimer = setTimeout(() => {
                toast.classList.remove('visible');
            }, 4800);
        }
    }, 1350);
}

// 6) Горячие клавиши для ПК
function initDesktopHotkeys() {
    window.addEventListener('keydown', e => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        if (isGlobeIntroActive) {
            if (e.key === 'Enter') {
                e.preventDefault();
                enterMapFromGlobe();
            }
            return;
        }

        const key = (e.key || '').toLowerCase();
        if (key === '1') {
            switchProjectTab('sakhalin1');
        } else if (key === '2') {
            switchProjectTab('sakhalin2');
        } else if (key === '3') {
            switchProjectTab('sakhalin3');
        } else if (key === '4') {
            switchProjectTab('shv');
        } else if (key === 'h' || key === 'р') {
            toggleCinemaMode();
        } else if (key === 'r' || key === 'к') {
            const p = getAdaptiveCameraPose(false);
            startCameraFly(p.pos, p.target);
        } else if (key === 't' || key === 'е') {
            const p = getAdaptiveCameraPose(true);
            startCameraFly(p.pos, p.target);
        } else if (key === 'w' || key === 'ц' || key === 'n' || key === 'т') {
            if (typeof cycleWeatherMode === 'function') cycleWeatherMode();
        } else if (e.key === 'Escape') {
            if (goldMaster.cinemaMode) {
                toggleCinemaMode(false);
            } else {
                closeDetailCard();
                closeMobileSidebar();
                closeTelemetryPanel();
                if (typeof closeProjectInfoModal === 'function') closeProjectInfoModal();
                if (typeof closeSettingsModal === 'function') closeSettingsModal();
                if (typeof closeLinkFallbackModal === 'function') closeLinkFallbackModal();
            }
        }
    });
}

// 7) Фоновая предзагрузка «Сахалин-1» и прогрев шейдеров во время показа 3D-планеты
function scheduleBackgroundWarmup() {
    if (goldMaster.warmedUp) return;
    const runWarmup = () => {
        if (goldMaster.warmedUp) return;
        goldMaster.warmedUp = true;
        try {
            if (!sakhalin1Built && typeof ensureSakhalin1Built === 'function') {
                ensureSakhalin1Built();
                snapProjectCrossfade(isFarEastProject());
                if (s1NauticalGridGroup) {
                    s1NauticalGridGroup.visible = isGridVisible && isFarEastProject();
                }
            }
            if (renderer && scene && camera) {
                renderer.compile(scene, camera);
            }
        } catch (_) {}
    };

    setTimeout(() => {
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(runWarmup, { timeout: 2200 });
        } else {
            runWarmup();
        }
    }, 1250);
}

function initGoldMasterPolish() {
    if (goldMaster.initialized) return;
    goldMaster.initialized = true;

    initScaleCalibration();
    buildWinterSnowfall();
    initDesktopHotkeys();
    scheduleBackgroundWarmup();

    const cinemaBtn = document.getElementById('btn-cinema-mode');
    const cinemaExitBtn = document.getElementById('cinema-exit-btn');
    if (cinemaBtn) cinemaBtn.addEventListener('click', () => toggleCinemaMode());
    if (cinemaExitBtn) cinemaExitBtn.addEventListener('click', () => toggleCinemaMode(false));

    // Перехватываем вход с планеты, чтобы один раз показать умную подсказку управления
    const origEnter = enterMapFromGlobe;
    enterMapFromGlobe = function() {
        origEnter();
        showFirstEntryControlsHint();
    };
}

function updateGoldMasterPolish(dt, elapsed) {
    if (!goldMaster.initialized) return;
    updateWinterSnowfall(dt, elapsed);
    updateDynamicScaleBar(dt);
    scanAndUpdateShipWakes(dt, elapsed);
}

