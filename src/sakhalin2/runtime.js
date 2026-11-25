'use strict';

// [BLOCK:S2_RUNTIME]
// =========================================================================
// 17. КОМПАКТНЫЙ РАНТАЙМ «САХАЛИН-2» (v27_clean):
//     Прямые ссылки на модели и суда, 0 обходов .traverse() в animate()
// =========================================================================
const s2Runtime = {
    initialized: false,
    heliPads: [],
    heliState: 'landed',
    heliTimer: 1.6,
    heliCruiseDur: 5.0,
    heliFromIdx: 0,
    heliToIdx: 1,
    heliCurPos: new THREE.Vector3(),
    heliCurYaw: 0,
    tonSpmPos: null,
    tonSpmTurntable: null,
    tonSpmBeacons: [],
    tonNightMats: [],
    lngBerthPos: null,
    oldLngBerthPos: null,
    lngShipBaseX: 0,
    lngShipBaseZ: 0,
    lngShipLastOutX: 0,
    lngShipLastOutZ: 0,
    lngShipPrevX: 0,
    lngShipPrevZ: 0,
    lngShipHasPrev: false,
    lngLoadingGroup: null,
    lngLoadingLine: null,
    lngLoadingDots: [],
    oilLoadingGroup: null,
    oilLoadingLine: null,
    oilLoadingDots: []
};

function getSakhalin2ActiveVessels() {
    const list = [];
    for (let i = 0; i < movingShips.length; i++) {
        const sh = movingShips[i] && movingShips[i].group;
        if (!sh || !sh.visible || !sh.parent || !sh.parent.visible) continue;
        list.push({ x: sh.position.x, z: sh.position.z, r: 4.9 });
    }
    return list;
}

function createTransferStream(colorHex, dotCount) {
    const grp = new THREE.Group();
    grp.visible = false;
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const lineMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.78 });
    const line = new THREE.Line(lineGeo, lineMat);
    grp.add(line);

    const dotGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const dots = [];
    for (let k = 0; k < dotCount; k++) {
        const m = new THREE.Mesh(dotGeo, dotMat);
        grp.add(m);
        dots.push(m);
    }
    sakhalin2Group.add(grp);
    return { grp, line, dots };
}

function initSakhalin2Runtime() {
    if (s2Runtime.initialized || !sakhalin2Group) return;
    s2Runtime.initialized = true;

    const padSpecs = [
        { id: 'pa-b',  ox: -2.01, oy: 2.25, oz: 0.12 },
        { id: 'pa-a',  ox: -1.93, oy: 2.07, oz: 0.12 },
        { id: 'lun-a', ox: -2.01, oy: 2.25, oz: 0.12 },
        { id: 'obtk',  ox: -2.65, oy: 0.36, oz: 0.10 }
    ];
    s2Runtime.heliPads = [];
    padSpecs.forEach(sp => {
        const entry = facilityModelsMap.get(sp.id);
        if (entry && entry.group) {
            const p = entry.group.position;
            s2Runtime.heliPads.push({
                id: sp.id,
                pos: new THREE.Vector3(p.x + sp.ox, p.y + sp.oy, p.z + sp.oz)
            });
        }
    });
    if (s2Runtime.heliPads.length >= 2) {
        s2Runtime.heliCurPos.copy(s2Runtime.heliPads[0].pos);
        s2Runtime.heliFromIdx = 0;
        s2Runtime.heliToIdx = 1;
        s2Runtime.heliState = 'landed';
        s2Runtime.heliTimer = 1.6;
    }

    const lngStream = createTransferStream(0x34d399, 4);
    s2Runtime.lngLoadingGroup = lngStream.grp;
    s2Runtime.lngLoadingLine = lngStream.line;
    s2Runtime.lngLoadingDots = lngStream.dots;

    const oilStream = createTransferStream(0xfacc15, 4);
    s2Runtime.oilLoadingGroup = oilStream.grp;
    s2Runtime.oilLoadingLine = oilStream.line;
    s2Runtime.oilLoadingDots = oilStream.dots;
}

function updateSakhalin2Runtime(dt, elapsed) {
    if (!s2Runtime.initialized || !sakhalin2Group || !sakhalin2Group.visible) return;

    // 1) Полёт вертолёта между площадками H
    const heli = supplyHelicopter && supplyHelicopter.group;
    const pads = s2Runtime.heliPads;
    if (heli && heli.visible && pads.length >= 2) {
        const fromPad = pads[s2Runtime.heliFromIdx].pos;
        const toPad = pads[s2Runtime.heliToIdx].pos;
        const cruiseAlt = 8.5;
        s2Runtime.heliTimer -= dt;

        if (s2Runtime.heliState === 'landed') {
            s2Runtime.heliCurPos.copy(fromPad);
            if (s2Runtime.heliTimer <= 0) {
                s2Runtime.heliState = 'takeoff';
                s2Runtime.heliTimer = 1.6;
            }
        } else if (s2Runtime.heliState === 'takeoff') {
            const t = 1.0 - Math.max(0, s2Runtime.heliTimer / 1.6);
            const ease = t * t * (3.0 - 2.0 * t);
            s2Runtime.heliCurPos.set(fromPad.x, fromPad.y + (cruiseAlt - fromPad.y) * ease, fromPad.z);
            const wantYaw = Math.atan2(toPad.x - fromPad.x, toPad.z - fromPad.z);
            let dy = (wantYaw - s2Runtime.heliCurYaw) % (Math.PI * 2);
            if (dy > Math.PI) dy -= Math.PI * 2;
            if (dy < -Math.PI) dy += Math.PI * 2;
            s2Runtime.heliCurYaw += dy * Math.min(1, dt * 3.5);
            if (s2Runtime.heliTimer <= 0) {
                const dist = Math.hypot(toPad.x - fromPad.x, toPad.z - fromPad.z);
                s2Runtime.heliCruiseDur = Math.max(3.5, dist / 6.2);
                s2Runtime.heliTimer = s2Runtime.heliCruiseDur;
                s2Runtime.heliState = 'cruise';
            }
        } else if (s2Runtime.heliState === 'cruise') {
            const t = 1.0 - Math.max(0, s2Runtime.heliTimer / (s2Runtime.heliCruiseDur || 5.0));
            const ease = t * t * (3.0 - 2.0 * t);
            s2Runtime.heliCurPos.set(
                fromPad.x + (toPad.x - fromPad.x) * ease,
                cruiseAlt + Math.sin(t * Math.PI) * 1.45,
                fromPad.z + (toPad.z - fromPad.z) * ease
            );
            const wantYaw = Math.atan2(toPad.x - fromPad.x, toPad.z - fromPad.z);
            let dy = (wantYaw - s2Runtime.heliCurYaw) % (Math.PI * 2);
            if (dy > Math.PI) dy -= Math.PI * 2;
            if (dy < -Math.PI) dy += Math.PI * 2;
            s2Runtime.heliCurYaw += dy * Math.min(1, dt * 4.0);
            if (s2Runtime.heliTimer <= 0) {
                s2Runtime.heliState = 'approach';
                s2Runtime.heliTimer = 1.8;
            }
        } else if (s2Runtime.heliState === 'approach') {
            const t = 1.0 - Math.max(0, s2Runtime.heliTimer / 1.8);
            const ease = t * t * (3.0 - 2.0 * t);
            s2Runtime.heliCurPos.set(toPad.x, cruiseAlt + (toPad.y - cruiseAlt) * ease, toPad.z);
            if (s2Runtime.heliTimer <= 0) {
                s2Runtime.heliCurPos.copy(toPad);
                s2Runtime.heliFromIdx = s2Runtime.heliToIdx;
                s2Runtime.heliToIdx = (s2Runtime.heliToIdx + 1) % pads.length;
                s2Runtime.heliState = 'landed';
                s2Runtime.heliTimer = 3.2;
            }
        }

        const hoverBob = s2Runtime.heliState === 'landed' ? 0 : Math.sin(elapsed * 5.2) * 0.08;
        heli.position.set(s2Runtime.heliCurPos.x, s2Runtime.heliCurPos.y + hoverBob, s2Runtime.heliCurPos.z);
        heli.rotation.set(s2Runtime.heliState === 'cruise' ? 0.14 : 0.0, s2Runtime.heliCurYaw, 0);
    }

    // 2) Газовоз СПГ: плавный подход к Т-причалу и поток отгрузки с жёлтых стендеров
    const lngEntry = facilityModelsMap.get('lng-carrier');
    const lngShip = lngEntry && lngEntry.group;
    const berth = s2Runtime.lngBerthPos;
    const oldBerth = s2Runtime.oldLngBerthPos;
    if (lngShip && lngShip.visible && berth && oldBerth) {
        const curX = lngShip.position.x;
        const curZ = lngShip.position.z;
        const engineUpdated = !s2Runtime.lngShipHasPrev ||
            Math.hypot(curX - s2Runtime.lngShipLastOutX, curZ - s2Runtime.lngShipLastOutZ) > 0.0005;
        if (engineUpdated) {
            s2Runtime.lngShipBaseX = curX;
            s2Runtime.lngShipBaseZ = curZ;
        }
        const origX = s2Runtime.lngShipBaseX;
        const origZ = s2Runtime.lngShipBaseZ;
        // Газовоз швартуется строго СБОКУ (слева/западнее) прямо напротив жёлтых стендеров СПГ!
        const dockSideX = berth.x - 1.12;
        const dockSideZ = berth.z - 0.15;
        const dToDock = Math.hypot(origX - dockSideX, origZ - dockSideZ);
        const lngMoving = (typeof movingShips !== 'undefined') ? movingShips.find(s => s && s.facility && s.facility.id === 'lng-carrier') : null;
        const isLngDocked = Boolean(lngMoving && lngMoving.state === 'docked');
        const tRaw = isLngDocked ? 1.0 : Math.max(0, Math.min(1, (8.5 - dToDock) / 6.5));
        const w = tRaw * tRaw * (3.0 - 2.0 * tRaw);
        let adjX = origX + (dockSideX - origX) * w;
        let adjZ = origZ + (dockSideZ - origZ) * w;
        // Не даём корпусу наезжать на сам мост или переднее швартовное крыло
        if (adjZ < berth.z + 2.35 && adjX > berth.x - 1.02) {
            adjX = berth.x - 1.08;
        }

        lngShip.position.x = adjX;
        lngShip.position.z = adjZ;
        s2Runtime.lngShipLastOutX = adjX;
        s2Runtime.lngShipLastOutZ = adjZ;

        const lngFac = FACILITIES_DATA.find(f => f.id === 'lng-carrier');
        if (lngFac && lngFac.position) lngFac.position.copy(lngShip.position);

        if (s2Runtime.lngShipHasPrev && w > 0.08) {
            const dx = adjX - s2Runtime.lngShipPrevX;
            const dz = adjZ - s2Runtime.lngShipPrevZ;
            const moveStep = Math.hypot(dx, dz);
            // Во время стоянки у причала держим судно ровно параллельно мосту (yaw = 0 — носом на юг, к выходу в море)
            const targetYaw = (moveStep > 0.006 && !isLngDocked) ? Math.atan2(dx, dz) : 0.0;
            let dy = (targetYaw - lngShip.rotation.y) % (Math.PI * 2);
            if (dy > Math.PI) dy -= Math.PI * 2;
            if (dy < -Math.PI) dy += Math.PI * 2;
            lngShip.rotation.y += dy * Math.min(1, dt * 6.0);
        }
        s2Runtime.lngShipPrevX = adjX;
        s2Runtime.lngShipPrevZ = adjZ;
        s2Runtime.lngShipHasPrev = true;

        if (s2Runtime.lngLoadingGroup) {
            const dLng = Math.hypot(adjX - berth.x, adjZ - berth.z);
            if (isLngDocked || dLng < 2.2) {
                s2Runtime.lngLoadingGroup.visible = true;
                const p0 = new THREE.Vector3(berth.x, 1.05, berth.z - 0.15);
                const p2 = new THREE.Vector3(adjX, lngShip.position.y + 0.65, adjZ);
                const p1 = p0.clone().lerp(p2, 0.5);
                p1.y += 0.38;
                const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
                s2Runtime.lngLoadingLine.geometry.setFromPoints(curve.getPoints(16));
                for (let k = 0; k < s2Runtime.lngLoadingDots.length; k++) {
                    const f = (elapsed * 0.75 + k / s2Runtime.lngLoadingDots.length) % 1.0;
                    curve.getPoint(f, s2Runtime.lngLoadingDots[k].position);
                }
            } else {
                s2Runtime.lngLoadingGroup.visible = false;
            }
        }
    }

    // 3) Нефтяной танкер и поворотная башня-кран ВПУ (с точным учётом масштаба spmGroup = 0.54!)
    const oilEntry = facilityModelsMap.get('tanker-aniva');
    const oilTanker = oilEntry && oilEntry.group;
    const spm = s2Runtime.tonSpmPos;
    if (oilTanker && oilTanker.visible && spm && s2Runtime.tonSpmTurntable) {
        const oilMoving = (typeof movingShips !== 'undefined') ? movingShips.find(s => s && s.facility && s.facility.id === 'tanker-aniva') : null;
        const isOilDocked = Boolean(oilMoving && oilMoving.state === 'docked');
        const dx = oilTanker.position.x - spm.x;
        const dz = oilTanker.position.z - spm.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 14.0 && dist > 0.1) {
            const wantYaw = Math.atan2(dx, dz);
            let dy = (wantYaw - s2Runtime.tonSpmTurntable.rotation.y) % (Math.PI * 2);
            if (dy > Math.PI) dy -= Math.PI * 2;
            if (dy < -Math.PI) dy += Math.PI * 2;
            s2Runtime.tonSpmTurntable.rotation.y += dy * Math.min(1, dt * 3.8);
            if (dist < 2.45) {
                oilTanker.position.x = spm.x + (dx / dist) * 2.45;
                oilTanker.position.z = spm.z + (dz / dist) * 2.45;
            }
        } else {
            const idleYaw = -2.35 + Math.sin(elapsed * 0.25) * 0.18;
            let dy = (idleYaw - s2Runtime.tonSpmTurntable.rotation.y) % (Math.PI * 2);
            if (dy > Math.PI) dy -= Math.PI * 2;
            if (dy < -Math.PI) dy += Math.PI * 2;
            s2Runtime.tonSpmTurntable.rotation.y += dy * Math.min(1, dt * 0.8);
        }

        if (s2Runtime.oilLoadingGroup) {
            if (isOilDocked || dist < 4.2) {
                s2Runtime.oilLoadingGroup.visible = true;
                const yaw = s2Runtime.tonSpmTurntable.rotation.y;
                // Точный кончик стрелы ВПУ: локальный (0, 2.68, 2.20) * масштаб башни 0.54 = (1.19, 1.45)
                const p0 = new THREE.Vector3(spm.x + Math.sin(yaw) * 1.19, 1.45, spm.z + Math.cos(yaw) * 1.19);
                const p2 = new THREE.Vector3(oilTanker.position.x, oilTanker.position.y + 0.52, oilTanker.position.z);
                const p1 = p0.clone().lerp(p2, 0.5);
                p1.y = Math.min(p0.y, p2.y) + 0.18;
                const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
                s2Runtime.oilLoadingLine.geometry.setFromPoints(curve.getPoints(16));
                for (let k = 0; k < s2Runtime.oilLoadingDots.length; k++) {
                    const f = (elapsed * 0.72 + k / s2Runtime.oilLoadingDots.length) % 1.0;
                    curve.getPoint(f, s2Runtime.oilLoadingDots[k].position);
                }
            } else {
                s2Runtime.oilLoadingGroup.visible = false;
            }
        }
    }

    // 4) Ночные окна ТОН и маячок башни ВПУ
    const s2Alpha = (typeof projectCrossfade !== 'undefined') ? projectCrossfade.s2Alpha : (activeProject === 'sakhalin2' ? 1 : 0);
    for (let i = 0; i < s2Runtime.tonNightMats.length; i++) {
        s2Runtime.tonNightMats[i].opacity = nightMix * 0.92 * s2Alpha;
    }
    for (let i = 0; i < s2Runtime.tonSpmBeacons.length; i++) {
        const blink = Math.sin(elapsed * 4.2 + i) > 0.25 ? 1.0 : 0.18;
        s2Runtime.tonSpmBeacons[i].opacity = blink * (0.48 + nightMix * 0.52) * s2Alpha;
    }
}
