'use strict';

const s1ProjectExtraObjects = [];
let s1SubseaS1Group = null;
let s1SubseaS3Group = null;
let s1SubseaShvGroup = null;

function buildBerkutMegaPlatform3D(group) {
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 });
    const iceCollarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.35 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.2 });
    const subDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.35 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 });
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.3 });
    const lifeboatMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 });

    // Подводно-надводный фундамент ОГТ и 4 массивные опоры с ледозащитными поясами
    const caissonBase = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.46, 2.35), concreteMat);
    caissonBase.position.y = 0.08;
    group.add(caissonBase);

    [[-0.82, -0.76], [0.82, -0.76], [-0.82, 0.76], [0.82, 0.76]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.92, 12), concreteMat);
        leg.position.set(lx, 0.92, lz);
        leg.castShadow = true;
        group.add(leg);

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.41, 0.36, 12), iceCollarMat);
        collar.position.set(lx, 0.16, lz);
        group.add(collar);
    });

    // Подпалубная рама, основная палуба и оранжевый кант по периметру
    const underDeck = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.20, 2.08), subDeckMat);
    underDeck.position.y = 1.78;
    group.add(underDeck);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.28, 2.36), deckMat);
    deck.position.y = 2.00;
    deck.castShadow = true;
    group.add(deck);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.90, 0.07, 2.40), accentMat);
    trim.position.y = 2.13;
    group.add(trim);

    // Многоуровневый жилой и энергетический комплекс с верхним мостиком
    const living = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.64, 1.66), accentMat);
    living.position.set(-0.66, 2.46, 0);
    living.castShadow = true;
    group.add(living);

    const roofCabin = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.24, 1.28), deckMat);
    roofCabin.position.set(-0.66, 2.90, 0);
    roofCabin.castShadow = true;
    group.add(roofCabin);

    // Подбуровое основание и 4-опорная буровая вышка
    const drillFloor = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.24, 0.88), subDeckMat);
    drillFloor.position.set(0.54, 2.26, 0);
    drillFloor.castShadow = true;
    group.add(drillFloor);

    [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]].forEach(([dx, dz]) => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.052, 1.92, 6), steelMat);
        strut.position.set(0.54 + dx * 0.72, 3.22, dz * 0.72);
        strut.rotation.z = dx * 0.40;
        strut.rotation.x = -dz * 0.40;
        strut.castShadow = true;
        group.add(strut);
    });

    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.14, 0.30), accentMat);
    crown.position.set(0.54, 4.18, 0);
    group.add(crown);

    // Вынесенная восьмиугольная вертолётная площадка H с подкосами (как на ПА-Б / ПА-А)
    const helipad = createCleanHelipadAssembly(true, -1);
    helipad.position.set(-2.24, 2.22, 0.12);
    group.add(helipad);

    // Высокодетализированные элементы при приближении камеры (Zoom LOD)
    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    // 1) Ярусы ферм буровой вышки, балкон верхового рабочего и буровая колонна
    [2.72, 3.24, 3.74].forEach((ty, idx) => {
        const span = 0.56 - idx * 0.11;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(span, 0.04, span), steelMat);
        frame.position.set(0.54, ty, 0);
        detailGroup.add(frame);
    });
    const monkeyBoard = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.07, 0.28), accentMat);
    monkeyBoard.position.set(0.74, 3.44, 0);
    detailGroup.add(monkeyBoard);

    const drillPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.84, 6), craneMat);
    drillPipe.position.set(0.54, 3.22, 0);
    detailGroup.add(drillPipe);

    // 2) Два ряда светящихся окон на жилом модуле и верхнем мостике
    [-0.48, 0.0, 0.48].forEach(wz => {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.28), windowMat);
        w1.position.set(-1.23, 2.58, wz);
        detailGroup.add(w1);

        const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.28), windowMat);
        w2.position.set(-1.23, 2.34, wz);
        detailGroup.add(w2);
    });
    [-0.34, 0.34].forEach(wz => {
        const wTop = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.34), windowMat);
        wTop.position.set(-1.10, 2.91, wz);
        detailGroup.add(wTop);
    });

    // 3) Два жёлтых морских пьедестальных крана с кабинами и стрелами
    [
        { cx: -0.02, cz: 0.92, rotY: 0.42, boomZ: 1.36 },
        { cx: 0.14, cz: -0.92, rotY: 2.72, boomZ: -1.36 }
    ].forEach(cr => {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.46, 10), craneMat);
        ped.position.set(cr.cx, 2.36, cr.cz);
        detailGroup.add(ped);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.20, 0.26), subDeckMat);
        cab.position.set(cr.cx, 2.64, cr.cz);
        detailGroup.add(cab);

        const boom = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 1.48), craneMat);
        boom.position.set(cr.cx + 0.32, 3.04, cr.boomZ);
        boom.rotation.y = cr.rotY;
        boom.rotation.x = cr.cz > 0 ? -0.46 : 0.46;
        boom.castShadow = true;
        detailGroup.add(boom);
    });

    // 4) Спасательные шлюпки-капсулы, сепараторы на палубе и выхлопные трубы
    [-0.26, 0.26].forEach(bz => {
        const boat = new THREE.Mesh(createCapsuleGeometry(0.085, 0.26, 8), lifeboatMat);
        boat.rotation.z = Math.PI / 2;
        boat.position.set(-1.30, 2.12, bz);
        detailGroup.add(boat);
    });

    [-0.52, 0.52].forEach(vz => {
        const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.62, 10), deckMat);
        vessel.rotation.z = Math.PI / 2;
        vessel.position.set(0.08, 2.28, vz);
        detailGroup.add(vessel);
    });

    [-0.42, 0.42].forEach(ez => {
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.68, 8), subDeckMat);
        exhaust.position.set(-0.30, 3.08, ez);
        detailGroup.add(exhaust);
    });

    // 5) Мачта связи с вращающимся радаром и леерное ограждение палубы
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.60, 6), steelMat);
    mast.position.set(-0.74, 3.30, -0.42);
    detailGroup.add(mast);
    const radarPivot = new THREE.Group();
    radarPivot.position.set(-0.74, 3.58, -0.42);
    radarPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.045, 0.055), deckMat));
    detailGroup.add(radarPivot);
    platformRadars.push({ pivot: radarPivot, speed: 2.1 });

    const railFront = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.055, 0.035), railMat);
    railFront.position.set(0, 2.21, 1.17);
    const railBack = new THREE.Mesh(new THREE.BoxGeometry(2.86, 0.055, 0.035), railMat);
    railBack.position.set(0, 2.21, -1.17);
    const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 2.36), railMat);
    railRight.position.set(1.42, 2.21, 0);
    detailGroup.add(railFront, railBack, railRight);

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 78 * 78 });

    // Факельная стрела с анимированным пламенем
    const fStart = new THREE.Vector3(1.15, 2.22, -0.82);
    const fEnd = new THREE.Vector3(2.02, 3.40, -1.48);
    const dir = new THREE.Vector3().subVectors(fEnd, fStart);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, dir.length(), 8), steelMat);
    boom.position.copy(fStart).addScaledVector(dir, 0.5);
    boom.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(boom);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 10), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
    flame.position.copy(fEnd).add(new THREE.Vector3(0, 0.15, 0));
    group.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.27, 10, 10), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.62 }));
    glow.position.copy(flame.position);
    group.add(glow);
    s1Flares.push({ flame, glow, phase: 0.7 });

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    beacon.position.set(0.54, 4.30, 0);
    group.add(beacon);
    s1Beacons.push({ mesh: beacon, phase: 1.2 });
}

function buildSakhalin1Hub3D(group, isMajorCity) {
    const sc = isMajorCity ? 1.35 : 1.0;
    addOnshoreFoundation(group, 2.2 * sc, 1.8 * sc, 2.05);

    const accentMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.36 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

    const hall = new THREE.Mesh(new THREE.BoxGeometry(1.55 * sc, 0.56 * sc, 1.05 * sc), accentMat);
    hall.position.set(-0.1, 0.46 * sc, 0);
    hall.castShadow = true;
    group.add(hall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.60 * sc, 0.09 * sc, 1.10 * sc), whiteMat);
    roof.position.set(-0.1, 0.76 * sc, 0);
    group.add(roof);

    [-0.45 * sc, 0.12 * sc].forEach(sx => {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * sc, 0.10 * sc, 1.25 * sc, 10), steelMat);
        st.position.set(sx, 1.05 * sc, -0.28 * sc);
        st.castShadow = true;
        group.add(st);
    });

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.36 * sc, 0.36 * sc, 0.52 * sc, 16), whiteMat);
    tank.position.set(0.78 * sc, 0.44 * sc, 0.24 * sc);
    tank.castShadow = true;
    group.add(tank);

    const win = new THREE.Mesh(new THREE.BoxGeometry(0.9 * sc, 0.14 * sc, 0.05), winMat);
    win.position.set(-0.1, 0.50 * sc, 0.53 * sc);
    group.add(win);
}

function buildDeKastriTerminal3D(group, baseY = 0.55) {
    addOnshoreFoundation(group, 3.0, 2.3, 2.05);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.30, metalness: 0.12 });
    const redRimMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.38 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
    const houseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.4 });

    // Крупные белые резервуары нефти Sokol с характерной красной окантовкой (как на фото)
    [[-0.78, -0.32], [0.22, -0.32], [1.05, 0.25]].forEach(([tx, tz], idx) => {
        const rad = idx < 2 ? 0.44 : 0.34;
        const h = idx < 2 ? 0.56 : 0.48;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 20), tankMat);
        t.position.set(tx, 0.18 + h * 0.5, tz);
        t.castShadow = true;
        group.add(t);

        const redBand = new THREE.Mesh(new THREE.CylinderGeometry(rad + 0.012, rad + 0.012, 0.09, 20), redRimMat);
        redBand.position.set(tx, 0.18 + h - 0.06, tz);
        group.add(redBand);
    });

    // Береговой насосный блок и операторная
    const ctrl = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.42, 0.62), houseMat);
    ctrl.position.set(-0.35, 0.39, 0.56);
    ctrl.castShadow = true;
    group.add(ctrl);

    const ctrlRoof = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 0.66), roofMat);
    ctrlRoof.position.set(-0.35, 0.62, 0.56);
    group.add(ctrlRoof);

    // Факельная мачта на склоне за резервуарами
    const flareMast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.35, 8), steelMat);
    flareMast.position.set(-1.12, 0.85, -0.78);
    group.add(flareMast);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.30, 8), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
    flame.position.set(-1.12, 1.62, -0.78);
    group.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.58 }));
    glow.position.copy(flame.position);
    group.add(glow);
    s1Flares.push({ flame, glow, phase: 2.3 });

    // Выход береговой эстакады-пирса в бухту Чихачёва к ВПУ (на сваях, строго над водой и зимним льдом)
    const pierLocalY = Math.max(0.28 - baseY, -0.32);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.14, 0.32), deckMat);
    pier.position.set(1.95, pierLocalY, 0.05);
    group.add(pier);
    [1.45, 2.10, 2.75].forEach(px => {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.35, 8), steelMat);
        pile.position.set(px, pierLocalY - 0.68, 0.05);
        group.add(pile);
    });
}

// =========================================================================
// 3D-МОДЕЛИ ПРОЕКТА «САХАЛИН-3» И МАГИСТРАЛИ МГП СХВ
// =========================================================================

// БТК «Сахалин-3» (установки подготовки газа, резервуары конденсата и факел)
function buildSakhalin3Btk3D(group) {
    addOnshoreFoundation(group, 2.95, 2.35, 2.60);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.34, metalness: 0.12 });
    const blueRoofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.40 });
    const amberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.38 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.36 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.52 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

    // Главный технологический цех подготовки газа (УПГ)
    const hall = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.52, 0.94), whiteMat);
    hall.position.set(-0.56, 0.40, 0.22);
    hall.castShadow = true;
    group.add(hall);
    const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.09, 1.00), blueRoofMat);
    hallRoof.position.set(-0.56, 0.69, 0.22);
    group.add(hallRoof);
    const hallWin = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.04), winMat);
    hallWin.position.set(-0.56, 0.46, 0.70);
    group.add(hallWin);

    // 4 вертикальные колонны-абсорберы / сепараторы подготовки газа
    for (let i = 0; i < 4; i++) {
        const cx = -1.02 + i * 0.34;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.18, 12), steelMat);
        col.position.set(cx, 0.72, -0.62);
        col.castShadow = true;
        group.add(col);
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.12, 12), amberMat);
        ring.position.set(cx, 1.04, -0.62);
        group.add(ring);
    }

    // Два резервуара газового конденсата с жёлто-оранжевым поясом
    [[0.78, -0.34], [0.78, 0.48]].forEach(([tx, tz]) => {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.54, 18), whiteMat);
        tank.position.set(tx, 0.41, tz);
        tank.castShadow = true;
        group.add(tank);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.372, 0.372, 0.09, 18), amberMat);
        band.position.set(tx, 0.58, tz);
        group.add(band);
    });

    // Блок АВО (аппараты воздушного охлаждения газа)
    const avo = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.44), darkSteelMat);
    avo.position.set(0.04, 0.26, -0.58);
    group.add(avo);

    // Факельная установка с живым пламенем
    const flareMast = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.048, 1.52, 8), steelMat);
    flareMast.position.set(-1.18, 0.90, -0.84);
    group.add(flareMast);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 8), new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
    flame.position.set(-1.18, 1.76, -0.84);
    group.add(flame);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.62 }));
    glow.position.copy(flame.position);
    group.add(glow);
    s1Flares.push({ flame, glow, phase: 1.4 });

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    beacon.position.set(-1.18, 1.66, -0.84);
    group.add(beacon);
    s1Beacons.push({ mesh: beacon, phase: 0.9 });
}

// Головная КС «Сахалин» (isHeadStation = true) и промежуточные линейные КС вдоль МГП СХВ (isHeadStation = false)
function buildCompressorStation3D(group, isHeadStation = true) {
    const sc = isHeadStation ? 1.12 : 0.84;
    addOnshoreFoundation(group, 2.55 * sc, 2.05 * sc, 1.95);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.38, metalness: 0.14 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.42 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.38 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.55, roughness: 0.38 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.45, roughness: 0.50 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

    // Компрессорный цех ГПА
    const gpaHall = new THREE.Mesh(new THREE.BoxGeometry(1.65 * sc, 0.52 * sc, 0.88 * sc), whiteMat);
    gpaHall.position.set(-0.22 * sc, 0.40 * sc, -0.24 * sc);
    gpaHall.castShadow = true;
    group.add(gpaHall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.70 * sc, 0.09 * sc, 0.94 * sc), blueMat);
    roof.position.set(-0.22 * sc, 0.69 * sc, -0.24 * sc);
    group.add(roof);

    const win = new THREE.Mesh(new THREE.BoxGeometry(1.15 * sc, 0.11 * sc, 0.04), winMat);
    win.position.set(-0.22 * sc, 0.44 * sc, 0.21 * sc);
    group.add(win);

    // Ряд газотурбинных выхлопных шахт ГПА (4 у ГКС, 3 у линейных КС)
    const stackCnt = isHeadStation ? 4 : 3;
    for (let i = 0; i < stackCnt; i++) {
        const sx = (-0.75 + i * (1.10 / Math.max(1, stackCnt - 1))) * sc;
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.065 * sc, 0.085 * sc, 1.08 * sc, 10), steelMat);
        st.position.set(sx, 1.04 * sc, -0.42 * sc);
        st.castShadow = true;
        group.add(st);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.078 * sc, 0.078 * sc, 0.09 * sc, 10), orangeMat);
        cap.position.set(sx, 1.54 * sc, -0.42 * sc);
        group.add(cap);
    }

    // Батарея АВО газа (перед цехом)
    const avoBase = new THREE.Mesh(new THREE.BoxGeometry(1.38 * sc, 0.26 * sc, 0.52 * sc), darkMat);
    avoBase.position.set(-0.18 * sc, 0.27 * sc, 0.54 * sc);
    group.add(avoBase);
    for (let f = -1; f <= 1; f++) {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * sc, 0.14 * sc, 0.06 * sc, 10), whiteMat);
        fan.position.set((-0.18 + f * 0.40) * sc, 0.43 * sc, 0.54 * sc);
        group.add(fan);
    }

    // Узел пылеуловителей и оранжевый входной/выходной коллектор
    for (let s = 0; s < 2; s++) {
        const sep = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * sc, 0.14 * sc, 0.72 * sc, 10), steelMat);
        sep.position.set(0.92 * sc, 0.50 * sc, (-0.28 + s * 0.44) * sc);
        sep.castShadow = true;
        group.add(sep);
    }
    const header = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * sc, 0.07 * sc, 1.30 * sc, 8), orangeMat);
    header.rotation.x = Math.PI / 2;
    header.position.set(0.92 * sc, 0.24 * sc, 0.05 * sc);
    group.add(header);

    // Мачта связи + заградительный огонь
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 1.35 * sc, 6), whiteMat);
    mast.position.set(-1.05 * sc, 0.80 * sc, 0.65 * sc);
    group.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.055 * sc, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    beacon.position.set(-1.05 * sc, 1.50 * sc, 0.65 * sc);
    group.add(beacon);
    s1Beacons.push({ mesh: beacon, phase: isHeadStation ? 0.3 : 1.7 });
}

// Береговые узлы подводного перехода через пролив Невельского (м. Погиби и м. Лазарева — без надводных мостов!)
function buildNevelskoyCrossing3D(group) {
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.82 });
    const houseMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.42 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.38 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 });

    // Мыс Лазарева (материк, запад) и мыс Погиби (Сахалин, восток)
    const shoreNodes = [
        { lon: 141.44, lat: 52.23 },
        { lon: 141.72, lat: 52.22 }
    ];
    shoreNodes.forEach((sn, idx) => {
        const [sx, sz] = lonLatToXZ(sn.lon, sn.lat);
        const sy = getAnySiteMaxElevation(sx, sz, 1.1) + 0.06;
        const nodeGrp = new THREE.Group();
        nodeGrp.position.set(sx - group.position.x, sy - group.position.y, sz - group.position.z);

        const pad = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.90, 0.95), concreteMat);
        pad.position.y = -0.36;
        nodeGrp.add(pad);

        const valveHouse = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.52), houseMat);
        valveHouse.position.set(0, 0.24, -0.10);
        nodeGrp.add(valveHouse);

        // Камеры запуска/приёма СОД (два оранжевых цилиндра)
        [-0.14, 0.14].forEach(pz => {
            const pig = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.72, 8), orangeMat);
            pig.rotation.z = Math.PI / 2;
            pig.position.set(0, 0.18, 0.24 + pz);
            nodeGrp.add(pig);
        });

        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.95, 6), steelMat);
        mast.position.set(idx === 0 ? -0.36 : 0.36, 0.56, -0.25);
        nodeGrp.add(mast);

        const light = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        light.position.set(idx === 0 ? -0.36 : 0.36, 1.06, -0.25);
        nodeGrp.add(light);
        s1Beacons.push({ mesh: light, phase: 2.0 + idx * 0.9 });

        group.add(nodeGrp);
    });
}

// Конечная ГРС Владивосток (о. Русский)
function buildGrsRussky3D(group) {
    addOnshoreFoundation(group, 1.75, 1.45, 0.95);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.36 });
    const blueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.42 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.38 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.4 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

    // Блок редуцирования и блок замера газа
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.38, 0.58), whiteMat);
    b1.position.set(-0.28, 0.32, 0.18);
    b1.castShadow = true;
    group.add(b1);
    const b1Roof = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.07, 0.62), blueMat);
    b1Roof.position.set(-0.28, 0.54, 0.18);
    group.add(b1Roof);
    const b1Win = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.09, 0.04), winMat);
    b1Win.position.set(-0.28, 0.36, 0.48);
    group.add(b1Win);

    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.48), whiteMat);
    b2.position.set(0.42, 0.29, -0.22);
    group.add(b2);
    const b2Roof = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.07, 0.52), orangeMat);
    b2Roof.position.set(0.42, 0.48, -0.22);
    group.add(b2Roof);

    // Входной газовый узел и свеча рассеивания
    const manifold = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8), orangeMat);
    manifold.rotation.z = Math.PI / 2;
    manifold.position.set(0.18, 0.22, 0.36);
    group.add(manifold);

    const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.038, 1.05, 6), steelMat);
    vent.position.set(-0.62, 0.66, -0.38);
    group.add(vent);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    beacon.position.set(-0.62, 1.22, -0.38);
    group.add(beacon);
    s1Beacons.push({ mesh: beacon, phase: 1.9 });
}

// Узнаваемая береговая буровая установка БУ «Ястреб» (высокая бело-синяя наклонная башня)
function buildYastrebRig3D(group, scale = 1.0) {
    addOnshoreFoundation(group, 2.05 * scale, 1.7 * scale, 1.85);

    const blueMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.38, metalness: 0.25 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32, metalness: 0.15 });
    const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.45 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

    // Основание под буровую (арктический модуль-укрытие)
    const subBase = new THREE.Mesh(new THREE.BoxGeometry(1.25 * scale, 0.44 * scale, 0.92 * scale), blueMat);
    subBase.position.set(0.10 * scale, 0.36 * scale, 0);
    subBase.castShadow = true;
    group.add(subBase);

    // Наклонный кожух основания башни (фирменный силуэт «Ястреба»)
    const lowerTower = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.44 * scale, 0.96 * scale, 4), blueMat);
    lowerTower.rotation.y = Math.PI / 4;
    lowerTower.position.set(0.18 * scale, 1.04 * scale, 0);
    lowerTower.castShadow = true;
    group.add(lowerTower);

    // Высокая белая верхняя мачта с красной маркировочной полосой
    const upperTower = new THREE.Mesh(new THREE.CylinderGeometry(0.10 * scale, 0.21 * scale, 1.25 * scale, 4), whiteMat);
    upperTower.rotation.y = Math.PI / 4;
    upperTower.position.set(0.18 * scale, 2.12 * scale, 0);
    upperTower.castShadow = true;
    group.add(upperTower);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.20 * scale, 0.14 * scale, 0.20 * scale), yellowMat);
    crown.position.set(0.18 * scale, 2.80 * scale, 0);
    group.add(crown);

    // Боковой технологический модуль и трубный стеллаж
    const sideHall = new THREE.Mesh(new THREE.BoxGeometry(0.75 * scale, 0.36 * scale, 0.85 * scale), whiteMat);
    sideHall.position.set(-0.68 * scale, 0.32 * scale, 0.05 * scale);
    sideHall.castShadow = true;
    group.add(sideHall);

    const winStrip = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.09 * scale, 0.03), winMat);
    winStrip.position.set(-0.68 * scale, 0.38 * scale, 0.48 * scale);
    group.add(winStrip);

    const pipeRack = new THREE.Mesh(new THREE.BoxGeometry(0.65 * scale, 0.14 * scale, 0.50 * scale), darkSteelMat);
    pipeRack.position.set(0.72 * scale, 0.21 * scale, 0.52 * scale);
    group.add(pipeRack);

    // Детали при приближении (Zoom LOD)
    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    const redBand = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.16 * scale, 0.22 * scale, 4), redStripeMat);
    redBand.rotation.y = Math.PI / 4;
    redBand.position.set(0.18 * scale, 2.38 * scale, 0);
    detailGroup.add(redBand);

    const rigLadder = new THREE.Mesh(new THREE.BoxGeometry(0.05 * scale, 2.05 * scale, 0.09 * scale), darkSteelMat);
    rigLadder.position.set(0.36 * scale, 1.72 * scale, 0);
    detailGroup.add(rigLadder);

    [-0.12 * scale, 0.04 * scale, 0.20 * scale].forEach(pz => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.024 * scale, 0.024 * scale, 0.58 * scale, 6), yellowMat);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(0.72 * scale, 0.30 * scale, 0.52 * scale + pz);
        detailGroup.add(pipe);
    });

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 75 * 75 });

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    beacon.position.set(0.18 * scale, 2.94 * scale, 0);
    group.add(beacon);
    s1Beacons.push({ mesh: beacon, phase: 0.4 + scale });
}

// Объединённый береговой узел: бело-оранжевый БКП «Чайво» + сине-белая БУ «Ястреб» на одной площадке
function buildChayvoComplexWithYastreb3D(group) {
    const baseY = group.position.y;
    const bkpX = -1.05, bkpZ = 0.05;
    const yasX = 1.15, yasZ = -0.05;

    const bkpLocalY = getAnyLandElevation(group.position.x + bkpX, group.position.z + bkpZ) - baseY;
    const yasLocalY = getAnyLandElevation(group.position.x + yasX, group.position.z + yasZ) - baseY;

    const bkpSub = new THREE.Group();
    bkpSub.position.set(bkpX, Math.max(-0.18, bkpLocalY), bkpZ);
    buildOnshoreComplex3D(bkpSub, true);
    group.add(bkpSub);

    const yastrebSub = new THREE.Group();
    yastrebSub.position.set(yasX, Math.max(-0.22, yasLocalY), yasZ);
    buildYastrebRig3D(yastrebSub, 0.92);
    group.add(yastrebSub);

    // Соединительная эстакада-коллектор между БУ «Ястреб» и БКП «Чайво»
    const bridgeY = Math.max(bkpSub.position.y, yastrebSub.position.y) + 0.30;
    const pipeBridge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.25, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.55, roughness: 0.35 })
    );
    pipeBridge.rotation.z = Math.PI / 2;
    pipeBridge.position.set(0.05, bridgeY, 0.0);
    group.add(pipeBridge);
}

// Узнаваемая морская платформа «Орлан» (массивный бетонный кессон CIDS + закрытая башня + 2 крана + площадка H)
function buildOrlanPlatform3D(group) {
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.74 });
    const darkBeltMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.35 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38, metalness: 0.2 });
    const subDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.3 });
    const moduleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.42 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.38 });
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.32, metalness: 0.3 });
    const lifeboatMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 });

    // Широкий массивный 8-гранный железобетонный кессон CIDS с ледозащитным поясом
    const caisson = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.56, 1.18, 8), concreteMat);
    caisson.rotation.y = Math.PI / 8;
    caisson.position.y = 0.58;
    caisson.castShadow = true;
    group.add(caisson);

    const iceBelt = new THREE.Mesh(new THREE.CylinderGeometry(1.49, 1.58, 0.30, 8), darkBeltMat);
    iceBelt.rotation.y = Math.PI / 8;
    iceBelt.position.y = 0.15;
    group.add(iceBelt);

    // Подпалубная силовая рама и многоуровневая палуба с оранжевым кантом
    const underDeck = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.16, 2.08), subDeckMat);
    underDeck.position.y = 1.16;
    group.add(underDeck);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.26, 2.28), deckMat);
    deck.position.y = 1.34;
    deck.castShadow = true;
    group.add(deck);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.06, 2.32), accentMat);
    trim.position.y = 1.46;
    group.add(trim);

    // Двухъярусный жилой модуль с верхним мостиком
    const quarters = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.58, 1.48), moduleMat);
    quarters.position.set(-0.66, 1.76, 0.10);
    quarters.castShadow = true;
    group.add(quarters);

    const topBridge = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 1.12), accentMat);
    topBridge.position.set(-0.66, 2.16, 0.10);
    topBridge.castShadow = true;
    group.add(topBridge);

    // Высокая центральная закрытая буровая башня «Орлана»
    const derrickBase = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.44, 0.72), accentMat);
    derrickBase.position.set(0.22, 1.68, -0.04);
    group.add(derrickBase);

    const derrickBody = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.36, 1.88, 4), deckMat);
    derrickBody.rotation.y = Math.PI / 4;
    derrickBody.position.set(0.22, 2.82, -0.04);
    derrickBody.castShadow = true;
    group.add(derrickBody);

    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.13, 0.26), accentMat);
    crown.position.set(0.22, 3.80, -0.04);
    group.add(crown);

    // Вынесенная восьмиугольная вертолётная площадка H с подкосами
    const helipad = createCleanHelipadAssembly(true, -1);
    helipad.position.set(-2.02, 1.56, 0.12);
    group.add(helipad);

    // Высокодетализированные элементы при приближении камеры (Zoom LOD)
    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    // 1) Пояса жёсткости закрытой башни, наружная лестница и площадка кронблока
    [2.28, 2.82, 3.34].forEach((ty, idx) => {
        const span = 0.52 - idx * 0.10;
        const band = new THREE.Mesh(new THREE.BoxGeometry(span, 0.05, span), accentMat);
        band.position.set(0.22, ty, -0.04);
        detailGroup.add(band);
    });
    const towerLadder = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.84, 0.12), subDeckMat);
    towerLadder.position.set(0.48, 2.80, -0.04);
    detailGroup.add(towerLadder);

    // 2) Два ряда светящихся окон на жилом блоке и мостике
    [-0.42, 0.10, 0.62].forEach(wz => {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.26), winMat);
        w1.position.set(-1.11, 1.86, wz);
        detailGroup.add(w1);

        const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.26), winMat);
        w2.position.set(-1.11, 1.64, wz);
        detailGroup.add(w2);
    });
    const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.86), winMat);
    bridgeWin.position.set(-1.01, 2.17, 0.10);
    detailGroup.add(bridgeWin);

    // 3) Два полноценных портальных крана с кабинами, противовесами и стрелами
    [
        { cx: -0.58, cz: -0.86, rotY: -0.35 },
        { cx: 0.88, cz: 0.76, rotY: 0.42 }
    ].forEach(({ cx, cz, rotY }) => {
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.48, 10), craneMat);
        ped.position.set(cx, 1.70, cz);
        detailGroup.add(ped);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.24), subDeckMat);
        cab.position.set(cx, 1.98, cz);
        detailGroup.add(cab);

        const boom = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 1.46), craneMat);
        boom.position.set(cx + Math.sin(rotY) * 0.44, 2.34, cz + Math.cos(rotY) * 0.44);
        boom.rotation.y = rotY;
        boom.rotation.x = -0.56;
        boom.castShadow = true;
        detailGroup.add(boom);
    });

    // 4) Спасательные шлюпки, выхлопные трубы, радар и леерное ограждение палубы
    [-0.22, 0.24].forEach(bz => {
        const boat = new THREE.Mesh(createCapsuleGeometry(0.08, 0.24, 8), lifeboatMat);
        boat.rotation.z = Math.PI / 2;
        boat.position.set(-1.16, 1.54, bz);
        detailGroup.add(boat);
    });

    [-0.32, 0.32].forEach(ez => {
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.56, 8), subDeckMat);
        exhaust.position.set(-0.38, 2.36, ez);
        detailGroup.add(exhaust);
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.52, 6), moduleMat);
    mast.position.set(-0.72, 2.52, -0.32);
    detailGroup.add(mast);
    const radarPivot = new THREE.Group();
    radarPivot.position.set(-0.72, 2.76, -0.32);
    radarPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.05), deckMat));
    detailGroup.add(radarPivot);
    platformRadars.push({ pivot: radarPivot, speed: -2.0 });

    const railFront = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.05, 0.03), railMat);
    railFront.position.set(0, 1.54, 1.13);
    const railBack = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.05, 0.03), railMat);
    railBack.position.set(0, 1.54, -1.13);
    const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 2.28), railMat);
    railRight.position.set(1.20, 1.54, 0);
    detailGroup.add(railFront, railBack, railRight);

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 78 * 78 });

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    beacon.position.set(0.22, 3.92, -0.04);
    group.add(beacon);
    s1Beacons.push({ mesh: beacon, phase: 2.1 });
}

// Выносной одноточечный причал (ВПУ) Де-Кастри — высокая жёлтая морская башня-ферма со стрелой
function buildDeKastriSpmTower3D(vpuXZ) {
    const spm = new THREE.Group();
    spm.position.set(vpuXZ[0], 0.05, vpuXZ[1]);

    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.30 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 });
    const hoseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65 });

    // Опорная колонна-монопайл, выходящая из воды
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.92, 12), yellowMat);
    column.position.y = 0.42;
    column.castShadow = true;
    spm.add(column);

    // Поворотная сервисная головка и жёлтая решётчатая башня
    const turret = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.28, 0.58), yellowMat);
    turret.position.y = 0.94;
    turret.castShadow = true;
    spm.add(turret);

    const framePost = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.64, 0.28), yellowMat);
    framePost.position.set(-0.12, 1.34, 0);
    spm.add(framePost);

    // Поворотная отгрузочная стрела-ферма, направленная в сторону танкера
    const boom = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 0.22), yellowMat);
    boom.position.set(0.56, 1.24, 0);
    boom.rotation.z = 0.24;
    boom.castShadow = true;
    spm.add(boom);

    // Свисающий нефтяной отгрузочный шланг
    const hoseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(1.18, 1.32, 0),
        new THREE.Vector3(1.32, 0.65, 0.08),
        new THREE.Vector3(1.12, 0.16, 0.20),
        new THREE.Vector3(1.52, 0.08, 0.32)
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 16, 0.045, 6, false), hoseMat);
    spm.add(hose);

    // Защитный отбойник у ватерлинии и сигнальный огонь
    const fender = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 16), darkMat);
    fender.rotation.x = Math.PI / 2;
    fender.position.y = 0.14;
    spm.add(fender);

    const topLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    topLight.position.set(-0.12, 1.72, 0);
    spm.add(topLight);
    s1Beacons.push({ mesh: topLight, phase: 1.5 });

    sakhalin1Group.add(spm);
    s1ProjectExtraObjects.push({ mesh: spm, projects: ['sakhalin1'] });
}

function buildSakhalin1Pipelines() {
    s1PipelineSegments = [];
    s1PipelineFlowParticles = [];

    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    function addS1Pipe(lonLatList, colorHex, emissiveHex, chainTag, radius = 0.16, isSubsea = false, minFloorY = 0.22) {
        const rawXZ = lonLatList.map(([lon, lat]) => lonLatToXZ(lon, lat));
        const cleanXZ = sanitizeXZList(rawXZ, 0.12);
        if (cleanXZ.length < 2) return;

        const coarseVecs = cleanXZ.map(([x, z]) => {
            const y = isSubsea ? 0.22 : Math.max(minFloorY, getAnyLandElevation(x, z) + 0.26);
            return new THREE.Vector3(x, y, z);
        });
        const baseCurve = new THREE.CatmullRomCurve3(coarseVecs, false, 'centripetal');
        const baseLen = baseCurve.getLength();
        const sampleCount = Math.min(260, Math.max(24, Math.ceil(baseLen * 0.95)));
        const terrainVecs = baseCurve.getPoints(sampleCount).map(pt => {
            const y = isSubsea ? 0.22 : Math.max(minFloorY, getAnyLandElevation(pt.x, pt.z) + 0.28);
            return new THREE.Vector3(pt.x, y, pt.z);
        });
        const curve = new THREE.CatmullRomCurve3(terrainVecs, false, 'centripetal');
        const len = curve.getLength();

        const mat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: emissiveHex,
            emissiveIntensity: 0.18,
            roughness: 0.32,
            metalness: 0.32,
            transparent: true,
            opacity: 1.0
        });
        const segs = Math.min(320, Math.max(20, Math.ceil(len * 1.4)));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius, 7, false), mat);
        tube.castShadow = true;
        sakhalin1Group.add(tube);
        s1PipelineSegments.push({ mesh: tube, mat, chainTag });

        const pulseCount = Math.max(3, Math.floor(len / 20));
        for (let p = 0; p < pulseCount; p++) {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.45, 7, 7), pulseMat);
            dot.visible = isFlowEnabled;
            sakhalin1Group.add(dot);
            s1PipelineFlowParticles.push({
                mesh: dot,
                curve,
                chainTag,
                t: p / pulseCount,
                speed: 0.20 / Math.max(12, len * 0.12)
            });
        }
    }

    // 1. Северный береговой коллектор Одопту -> БКП «Чайво» (вдоль восточного побережья, Сахалин-1 — оранжевый)
    addS1Pipe([
        [143.04, 53.46],
        [143.00, 53.16],
        [143.01, 52.80],
        [143.02, 52.40]
    ], 0xf97316, 0xc2410c, 's1-shelf', 0.14);

    // 2. Морские линии «Беркут» (Аркутун-Даги) и «Орлан» -> единый узел Чайво / БУ «Ястреб» (Сахалин-1 — оранжевый)
    addS1Pipe([
        [143.92, 52.44],
        [143.58, 52.42],
        [143.10, 52.40]
    ], 0xf97316, 0xc2410c, 's1-shelf', 0.14, true);

    addS1Pipe([
        [143.56, 52.32],
        [143.34, 52.36],
        [143.10, 52.40]
    ], 0xf97316, 0xc2410c, 's1-shelf', 0.13, true);

    // 3A. Трубопровод «Сахалин-3» (ПДК Южно-Киринское -> Киринское -> БТК S3) строится строго на морском дне в buildSakhalin1SubseaStructures (0 надводных линий!)

    // 3B. Газопровод БТК «Сахалин-3» -> ГКС «Сахалин» (Сахалин-3 — синий)
    addS1Pipe([
        [143.08, 51.20],
        [142.94, 51.35],
        [142.80, 51.50]
    ], 0x3b82f6, 0x1d4ed8, 's3-gas-btk-gks', 0.19);

    // 3C. Газовая ветка БКП «Чайво» -> ГКС «Сахалин» (привязана к вкладке СХВ — красный)
    addS1Pipe([
        [143.02, 52.40],
        [142.96, 51.96],
        [142.80, 51.50]
    ], 0xef4444, 0xb91c1c, 's1-gas-chayvo-gks', 0.20);

    // 3D. Единая магистраль МГП «Сахалин — Хабаровск — Владивосток» (СХВ — красный, minFloorY=0.36 для чёткой видимости перехода пр. Невельского)
    addS1Pipe([
        [142.80, 51.50],
        [142.42, 51.88],
        [141.96, 52.16],
        [141.68, 52.22],
        [141.48, 52.23],
        [140.45, 52.12],
        [139.05, 51.62],
        [137.85, 51.05],
        [137.01, 50.55],
        [136.25, 49.62],
        [135.08, 48.48],
        [134.55, 47.05],
        [133.90, 45.65],
        [133.48, 44.95],
        [132.85, 44.10],
        [131.88, 43.12]
    ], 0xef4444, 0xb91c1c, 's1-gas-far-east', 0.22, false, 0.36);

    // 4. Западный вектор от Хабаровска в сторону Сибири / Екатеринбурга (СХВ — красный)
    addS1Pipe([
        [135.08, 48.48],
        [133.20, 48.78],
        [131.20, 49.28],
        [129.40, 50.25],
        [128.35, 51.18],
        [127.10, 52.18],
        [125.55, 52.98],
        [124.20, 53.35],
        [122.40, 53.55],
        [120.10, 53.38]
    ], 0xf87171, 0xb91c1c, 's1-gas-west', 0.18, false, 0.48);

    // 5. Экспортный нефтепровод БКП «Чайво» -> пролив -> Де-Кастри (Сахалин-1 — оранжевый)
    addS1Pipe([
        [143.02, 52.40],
        [142.62, 52.24],
        [142.18, 52.04],
        [141.78, 51.96],
        [141.44, 51.92],
        [141.12, 51.84],
        [140.94, 51.66],
        [140.78, 51.47]
    ], 0xf97316, 0xea580c, 's1-oil-dekastri', 0.16);

    // 6. Подводный отвод от терминала Де-Кастри к башне-ферме ВПУ в чистой воде бухты Чихачёва (Сахалин-1 — оранжевый)
    const dkVpuXZ = lonLatToXZ(141.08, 51.44);
    addS1Pipe([
        [140.78, 51.47],
        [141.08, 51.44]
    ], 0xf97316, 0xea580c, 's1-oil-dekastri', 0.12, true);

    buildDeKastriSpmTower3D(dkVpuXZ);
}

function buildSakhalin1FacilitiesAndShip() {
    const ringGeo = new THREE.RingGeometry(1.25, 1.62, 28);
    ringGeo.rotateX(-Math.PI / 2);

    SAKHALIN1_FACILITIES_DATA.forEach(fac => {
        const group = new THREE.Group();
        fac.position = lonLatToVec3(fac.geoLonLat[0], fac.geoLonLat[1], 0.08);

        if (fac.id === 's3-pdk' || fac.id === 's3-south-kirinskoye') {
            // Полностью подводная добыча — над поверхностью воды НЕТ платформ, вышек и конструкций!
            fac.position.y = 0.05;
        } else if (fac.id === 's3-nevelskoy') {
            fac.position.y = 0.06;
        } else if (fac.id === 's3-grs-russky') {
            fac.position.y = 0.54;
        } else if (fac.category === 'onshore' || fac.id === 's1-odoptu') {
            if (fac.id === 's1-chayvo') {
                fac.position.y = Math.max(0.35, getAnyLandElevation(fac.position.x, fac.position.z));
            } else if (fac.id === 's1-odoptu') {
                fac.position.y = Math.max(0.38, getAnyLandElevation(fac.position.x, fac.position.z) + 0.06);
            } else if (fac.id === 's3-btk') {
                fac.position.y = Math.max(0.76, getAnyLandElevation(fac.position.x, fac.position.z) + 0.56);
            } else if (fac.id === 's1-vladivostok') {
                fac.position.y = getAnySiteMaxElevation(fac.position.x, fac.position.z, 2.35) + 0.14;
            } else if (fac.id === 's1-dekastri') {
                fac.position.y = getAnySiteMaxElevation(fac.position.x, fac.position.z, 2.25) + 0.16;
            } else {
                fac.position.y = getAnySiteMaxElevation(fac.position.x, fac.position.z, 2.0) + 0.08;
            }
        } else {
            fac.position.y = 0.06;
        }
        group.position.copy(fac.position);

        if (fac.id === 's1-berkut') {
            buildBerkutMegaPlatform3D(group);
        } else if (fac.id === 's1-orlan') {
            buildOrlanPlatform3D(group);
        } else if (fac.id === 's1-odoptu') {
            buildYastrebRig3D(group, 0.88);
        } else if (fac.id === 's1-chayvo') {
            buildChayvoComplexWithYastreb3D(group);
        } else if (fac.id === 's1-dekastri') {
            buildDeKastriTerminal3D(group, fac.position.y);
        } else if (fac.id === 's1-komsomolsk' || fac.id === 's1-khabarovsk' || fac.id === 's1-vladivostok') {
            buildSakhalin1Hub3D(group, true);
        } else if (fac.id === 's3-pdk' || fac.id === 's3-south-kirinskoye') {
            // Над водой пусто — 3D-модули Киринского и Южно-Киринского ПДК находятся строго на морском дне (s1SubseaS3Group)
        } else if (fac.id === 's3-btk') {
            buildSakhalin3Btk3D(group);
        } else if (fac.id === 's3-gks') {
            buildCompressorStation3D(group, true);
        } else if (fac.id === 's3-nevelskoy') {
            buildNevelskoyCrossing3D(group);
        } else if (fac.id === 's3-ks-mainland' || fac.id === 's3-ks-north' || fac.id === 's3-ks-south') {
            buildCompressorStation3D(group, false);
        } else if (fac.id === 's3-grs-russky') {
            buildGrsRussky3D(group);
        } else if (fac.isMovingShip) {
            buildVessel3D(group, fac.shipType);
        }

        let selectionRing;
        if (fac.isInactiveCross) {
            // Для неработающего Южно-Киринского месторождения — объёмный красный крестик (✕) вместо кружочка!
            const crossMat = new THREE.MeshBasicMaterial({
                color: 0xef4444,
                transparent: true,
                opacity: 0.90,
                side: THREE.DoubleSide
            });
            const crossGrp = new THREE.Group();
            const barGeo = new THREE.BoxGeometry(2.8, 0.14, 0.44);
            const bar1 = new THREE.Mesh(barGeo, crossMat);
            bar1.rotation.y = Math.PI / 4;
            const bar2 = new THREE.Mesh(barGeo, crossMat);
            bar2.rotation.y = -Math.PI / 4;
            crossGrp.add(bar1, bar2);
            crossGrp.position.y = 0.18;
            crossGrp.material = crossMat;
            selectionRing = crossGrp;
        } else {
            const ringMat = new THREE.MeshBasicMaterial({
                color: fac.markerColor,
                transparent: true,
                opacity: fac.id === 's3-pdk' ? 0.30 : 0.48,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -2
            });
            if ((fac.category === 'onshore' || fac.id === 's1-odoptu') && typeof createTerrainConformingRingGeo === 'function') {
                const sc = (fac.id === 's1-chayvo') ? 1.65 : 1.0;
                const conformedGeo = createTerrainConformingRingGeo(
                    fac.position.x, fac.position.z, fac.position.y,
                    1.25 * sc, 1.62 * sc, 36, getAnyLandElevation, 0.14
                );
                selectionRing = new THREE.Mesh(conformedGeo, ringMat);
                selectionRing.position.y = 0.0;
            } else {
                selectionRing = new THREE.Mesh(ringGeo, ringMat);
                selectionRing.position.y = 0.16;
                if (fac.id === 's1-chayvo') {
                    selectionRing.scale.setScalar(1.65);
                } else if (fac.id === 's3-pdk') {
                    selectionRing.scale.setScalar(1.35);
                }
            }
        }
        group.add(selectionRing);

        const hitRad = fac.id === 's1-chayvo' ? 3.2 : 2.2;
        const hitbox = new THREE.Mesh(
            new THREE.CylinderGeometry(hitRad, hitRad, 3.8, 10),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        hitbox.position.y = 1.6;
        hitbox.userData.facilityId = fac.id;
        hitbox.userData.category = fac.category;
        group.add(hitbox);
        s1ClickableObjects.push(hitbox);

        sakhalin1Group.add(group);
        s1FacilityModelsMap.set(fac.id, { group, selectionRing });

        if (fac.isMovingShip && fac.routeWaypoints) {
            const curvePts = sanitizeVec3List(
                fac.routeWaypoints.map(([lon, lat]) => lonLatToVec3(lon, lat, 0.06)),
                0.1
            );
            if (curvePts.length >= 3) {
                const shipCurve = new THREE.CatmullRomCurve3(curvePts, false, 'centripetal');
                const routeSampled = shipCurve.getPoints(120).map(p => new THREE.Vector3(p.x, 0.12, p.z));
                const routeGeo = new THREE.BufferGeometry().setFromPoints(routeSampled);
                const routeMat = new THREE.LineDashedMaterial({
                    color: fac.routeColor || 0xfacc15,
                    dashSize: 1.8,
                    gapSize: 1.2,
                    transparent: true,
                    opacity: 0.34
                });
                const routeLine = new THREE.Line(routeGeo, routeMat);
                routeLine.computeLineDistances();
                sakhalin1Group.add(routeLine);

                const stops = (fac.dockStops || []).map(ds => {
                    const stopVec = lonLatToVec3(ds.lonLat[0], ds.lonLat[1], 0.06);
                    let bestT = 0;
                    let bestD = Infinity;
                    for (let k = 0; k < 200; k++) {
                        const tt = k / 200;
                        const dSq = shipCurve.getPointAt(tt).distanceToSquared(stopVec);
                        if (dSq < bestD) { bestD = dSq; bestT = tt; }
                    }
                    return {
                        t: bestT,
                        targetPos: lonLatToVec3(ds.targetLonLat[0], ds.targetLonLat[1], ds.targetY || 0.4),
                        duration: ds.duration || 6.5,
                        color: ds.color || 0xfacc15,
                        phaseLabel: ds.phaseLabel || 'Погрузка',
                        statusText: ds.statusText || 'Погрузка нефти у ВПУ'
                    };
                }).sort((a, b) => a.t - b.t);

                const transferGroup = new THREE.Group();
                transferGroup.visible = false;
                const tLineGeo = new THREE.BufferGeometry();
                tLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
                const transferLine = new THREE.Line(
                    tLineGeo,
                    new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.88 })
                );
                transferGroup.add(transferLine);

                const transferPulses = [];
                const pMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
                for (let p = 0; p < 4; p++) {
                    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), pMat);
                    transferGroup.add(sp);
                    transferPulses.push(sp);
                }
                sakhalin1Group.add(transferGroup);

                const initT = fac.initialT || 0;
                let nextIdx = stops.findIndex(s => s.t > initT);
                if (nextIdx < 0) nextIdx = 0;

                s1MovingShips.push({
                    facility: fac,
                    group,
                    curve: shipCurve,
                    routeLine,
                    routeMat,
                    stops,
                    nextStopIndex: nextIdx,
                    transferGroup,
                    transferLine,
                    transferPulses,
                    t: initT,
                    speed: fac.shipSpeed || 0.015,
                    speedFactor: 1.0,
                    state: 'cruising',
                    dockTimer: 0,
                    progress: 0,
                    statusText: `В рейсе • ${fac.cruiseKnots || 14} узл.`,
                    phaseLabel: 'Рейс'
                });
            }
        }
    });
}

// Точная привязка конечной ГРС «о. Русский» к 3D-острову Русский и доводка финального участка МГП СХВ через пролив Босфор Восточный
function syncSakhalin3RusskyGrs() {
    if (typeof farEastAlive === 'undefined' || !farEastAlive.russkyIslandPos) return;
    const grsFac = SAKHALIN1_FACILITIES_DATA.find(f => f.id === 's3-grs-russky');
    const grsEntry = s1FacilityModelsMap.get('s3-grs-russky');
    if (!grsFac || !grsEntry) return;

    const islPos = farEastAlive.russkyIslandPos;
    const targetX = islPos.x - 0.55;
    const targetY = islPos.y + 0.02;
    const targetZ = islPos.z - 0.15;

    grsFac.position.set(targetX, targetY, targetZ);
    grsEntry.group.position.set(targetX, targetY, targetZ);

    // Финальный участок МГП СХВ: терминал Владивосток -> напрямую через пролив Босфор Восточный -> ГРС о. Русский (без крюка)
    const [vlX, vlZ] = lonLatToXZ(131.88, 43.12);
    const vlY = Math.max(0.45, getAnyLandElevation(vlX, vlZ) + 0.26);
    const midX = (vlX + targetX) * 0.5;
    const midZ = (vlZ + targetZ) * 0.5;

    const endPts = [
        new THREE.Vector3(vlX, vlY, vlZ),
        new THREE.Vector3(midX, 0.26, midZ),
        new THREE.Vector3(targetX, targetY + 0.22, targetZ)
    ];
    const endCurve = new THREE.CatmullRomCurve3(endPts, false, 'centripetal');
    const endMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.18,
        roughness: 0.32,
        metalness: 0.32,
        transparent: true,
        opacity: 1.0
    });
    const endTube = new THREE.Mesh(new THREE.TubeGeometry(endCurve, 32, 0.19, 7, false), endMat);
    endTube.castShadow = true;
    sakhalin1Group.add(endTube);
    s1PipelineSegments.push({ mesh: endTube, mat: endMat, chainTag: 's1-gas-far-east' });

    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let p = 0; p < 3; p++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.26, 7, 7), pulseMat);
        dot.visible = isFlowEnabled;
        sakhalin1Group.add(dot);
        s1PipelineFlowParticles.push({
            mesh: dot,
            curve: endCurve,
            chainTag: 's1-gas-far-east',
            t: p / 3,
            speed: 0.14
        });
    }

    // Подводная нитка перехода пролива Босфор Восточный в режиме X-Ray (принадлежит вкладке СХВ)
    const subShvTarget = s1SubseaShvGroup || s1SubseaGroup;
    if (subShvTarget) {
        const subEndCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(vlX, -0.35, vlZ),
            new THREE.Vector3(midX, -1.45, midZ),
            new THREE.Vector3(targetX, -0.25, targetZ)
        ], false, 'centripetal');
        const subEndTube = new THREE.Mesh(
            new THREE.TubeGeometry(subEndCurve, 24, 0.14, 7, false),
            new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.38, roughness: 0.35 })
        );
        subShvTarget.add(subEndTube);
    }
}

function createSakhalin1DomMarkers() {
    const layer = document.getElementById('markers-layer');
    s1CityDomList = [];
    s1MarkerDomMap.clear();

    FAR_EAST_CITIES_DATA.forEach(city => {
        const [wx, wz] = lonLatToXZ(city.geoLonLat[0], city.geoLonLat[1]);
        const wy = Math.max(0.5, getFarEastElevation(wx, wz)) + (city.isRegion ? 2.4 : 0.95);

        const el = document.createElement('div');
        if (city.isRegion) {
            el.className = 'region-label-3d';
            el.textContent = city.name;
        } else if (city.isTransit) {
            el.className = 'transit-label-3d';
            el.textContent = city.name;
        } else if (city.isNeighbor) {
            el.className = 'neighbor-country-label-3d';
            el.textContent = city.name;
        } else {
            el.className = 'city-label-3d';
            const dotColor = city.isWaterOrIsland ? '#7dd3fc' : '#fb923c';
            el.innerHTML = `<span class="city-dot" style="background-color:${dotColor};"></span><span>${city.name}</span>`;
        }
        el.style.display = 'none';
        layer.appendChild(el);
        s1CityDomList.push({
            el,
            worldPos: new THREE.Vector3(wx, wy, wz),
            isCenter: Boolean(city.isRegion || city.isTransit || city.isNeighbor),
            lastX: -9999,
            lastY: -9999,
            visible: false
        });
    });

    SAKHALIN1_FACILITIES_DATA.forEach(fac => {
        const el = document.createElement('div');
        el.className = 'marker-3d';
        el.dataset.id = fac.id;
        el.style.display = 'none';
        el.innerHTML = fac.isInactiveCross
            ? `
            <div class="marker-badge" style="border-color: rgba(239, 68, 68, 0.8);">
                <span class="marker-icon" style="background-color: #dc2626; color: #ffffff; font-size: 11px; font-weight: 900; line-height: 1;">✕</span>
                <span class="marker-text text-[11px] font-bold text-rose-100 tracking-tight">${fac.code}</span>
            </div>
        `
            : `
            <div class="marker-badge">
                <span class="marker-icon" style="background-color: ${fac.markerColor}; color: ${fac.markerColor};">
                    <span class="w-2 h-2 rounded-full bg-white"></span>
                </span>
                <span class="marker-text text-[11px] font-bold text-white tracking-tight">${fac.code}</span>
            </div>
        `;
        el.addEventListener('click', e => {
            e.stopPropagation();
            selectFacility(fac.id, true);
        });
        layer.appendChild(el);
        s1MarkerDomMap.set(fac.id, { el, lastX: -9999, lastY: -9999, visible: false });
    });
}

function buildSakhalin1SubseaStructures() {
    s1SubseaGroup = new THREE.Group();
    s1SubseaGroup.visible = isSubseaMode;
    sakhalin1Group.add(s1SubseaGroup);

    // Раздельные подводные подгруппы для чистой изоляции проектов (Сахалин-1 / Сахалин-3 / СХВ)
    s1SubseaS1Group = new THREE.Group();
    s1SubseaS3Group = new THREE.Group();
    s1SubseaShvGroup = new THREE.Group();
    s1SubseaGroup.add(s1SubseaS1Group, s1SubseaS3Group, s1SubseaShvGroup);
    s1ProjectExtraObjects.push(
        { mesh: s1SubseaS1Group, projects: ['sakhalin1'] },
        { mesh: s1SubseaS3Group, projects: ['sakhalin3'] },
        { mesh: s1SubseaShvGroup, projects: ['shv'] }
    );

    const concreteBaseMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72, metalness: 0.15 });
    const steelCaissonMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });
    const wellPipeMat = new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xea580c,
        emissiveIntensity: 0.45,
        roughness: 0.3
    });
    const subseaOilMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xc2410c,
        emissiveIntensity: 0.35,
        roughness: 0.35
    });
    const subseaGasMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xc2410c,
        emissiveIntensity: 0.35,
        roughness: 0.35
    });
    const subseaShvMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xb91c1c,
        emissiveIntensity: 0.38,
        roughness: 0.35
    });

    // Бетонное гравитационное основание платформы «Беркут» (Аркутун-Даги, восточнее Чайво)
    const [bkX, bkZ] = lonLatToXZ(143.92, 52.44);
    const bkSlab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.65, 3.2), concreteBaseMat);
    bkSlab.position.set(bkX, -2.08, bkZ);
    s1SubseaS1Group.add(bkSlab);
    [[-0.82, -0.82], [0.82, -0.82], [-0.82, 0.82], [0.82, 0.82]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.40, 0.54, 2.05, 12), concreteBaseMat);
        leg.position.set(bkX + lx, -1.0, bkZ + lz);
        s1SubseaS1Group.add(leg);
    });

    // Подводное основание платформы «Орлан» (кессон CIDS)
    const [orX, orZ] = lonLatToXZ(143.56, 52.32);
    const orBase = new THREE.Mesh(new THREE.CylinderGeometry(1.54, 1.88, 2.25, 8), concreteBaseMat);
    orBase.rotation.y = Math.PI / 8;
    orBase.position.set(orX, -1.12, orZ);
    s1SubseaS1Group.add(orBase);

    // Подводные добывающие скважины и пульсация на морском дне
    [[bkX, bkZ, 4], [orX, orZ, 3]].forEach(([wx, wz, cnt], idx) => {
        for (let k = 0; k < cnt; k++) {
            const offX = (k - (cnt - 1) * 0.5) * 0.34;
            const well = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), wellPipeMat);
            well.position.set(wx + offX, -1.25, wz + 0.15);
            s1SubseaS1Group.add(well);
        }
        const pulse = new THREE.Mesh(
            new THREE.RingGeometry(1.7, 2.1, 24),
            new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
        );
        pulse.rotation.x = -Math.PI / 2;
        pulse.position.set(wx, -2.35, wz);
        s1SubseaS1Group.add(pulse);
        subseaPulseNodes.push({ mesh: pulse, phase: 2.2 + idx * 1.3 });
    });

    // Подводные участки трубопроводов «Беркут / Орлан -> БУ Ястреб» и переход Татарского пролива в Де-Кастри
    function addS1SubseaPipe(lonLatPts, mat, targetGroup) {
        const vecs = lonLatPts.map(([lon, lat]) => {
            const [x, z] = lonLatToXZ(lon, lat);
            const y = Math.min(-0.18, Math.max(-2.22, getAnyLandElevation(x, z) + 0.18));
            return new THREE.Vector3(x, y, z);
        });
        const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal');
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.13, 7, false), mat);
        (targetGroup || s1SubseaS1Group).add(tube);
    }

    addS1SubseaPipe([[143.92, 52.44], [143.58, 52.43], [143.10, 52.40]], subseaOilMat, s1SubseaS1Group);
    addS1SubseaPipe([[143.56, 52.32], [143.34, 52.36], [143.10, 52.40]], subseaGasMat, s1SubseaS1Group);
    addS1SubseaPipe([[141.78, 51.96], [141.44, 51.92], [141.12, 51.84]], subseaOilMat, s1SubseaS1Group);

    // Подводный фундамент и райзер башни ВПУ Де-Кастри
    const [dkX, dkZ] = lonLatToXZ(141.08, 51.44);
    const plem = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 1.15), concreteBaseMat);
    plem.position.set(dkX, -2.20, dkZ);
    s1SubseaS1Group.add(plem);
    const monopile = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 2.25, 12), steelCaissonMat);
    monopile.position.set(dkX, -1.08, dkZ);
    s1SubseaS1Group.add(monopile);
    const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.25, 8), subseaOilMat);
    riser.position.set(dkX + 0.28, -1.08, dkZ);
    s1SubseaS1Group.add(riser);

    // =========================================================================
    // ПОДВОДНЫЕ ДОБЫЧНЫЕ КОМПЛЕКСЫ (ПДК) «САХАЛИН-3» — СТРОГО НА МОРСКОМ ДНЕ!
    // (Киринское и Южно-Киринское месторождения + донный газопровод к БТК S3)
    // =========================================================================
    const pdkYellowMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xca8a04,
        emissiveIntensity: 0.42,
        roughness: 0.30,
        metalness: 0.28
    });
    const pdkOrangeMat = new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xc2410c,
        emissiveIntensity: 0.38,
        roughness: 0.34,
        metalness: 0.25
    });
    const pdkPipeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.30,
        metalness: 0.30
    });

    function buildSubseaPdkCluster(lon, lat, isLargeSouth) {
        const [px, pz] = lonLatToXZ(lon, lat);
        const pdk = new THREE.Group();
        pdk.position.set(px, -2.18, pz);
        const sc = isLargeSouth ? 1.24 : 1.0;

        // Донное основание-фундамент ПДК (mudmat)
        const mudmat = new THREE.Mesh(new THREE.BoxGeometry(2.6 * sc, 0.22, 2.1 * sc), concreteBaseMat);
        mudmat.position.y = 0.0;
        pdk.add(mudmat);

        // Центральный жёлто-оранжевый подводный манифольд (ПМ) в защитной раме от тралов и льда
        const manifoldCore = new THREE.Mesh(new THREE.BoxGeometry(1.15 * sc, 0.56 * sc, 0.72 * sc), pdkOrangeMat);
        manifoldCore.position.set(0, 0.42 * sc, 0);
        pdk.add(manifoldCore);

        // Жёлтая трубчатая защитная рама вокруг манифольда
        [[-0.68, -0.48], [0.68, -0.48], [-0.68, 0.48], [0.68, 0.48]].forEach(([rx, rz]) => {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * sc, 0.065 * sc, 0.84 * sc, 8), pdkYellowMat);
            post.position.set(rx * sc, 0.48 * sc, rz * sc);
            pdk.add(post);
        });
        [-0.48, 0.48].forEach(rz => {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(1.48 * sc, 0.08 * sc, 0.08 * sc), pdkYellowMat);
            rail.position.set(0, 0.88 * sc, rz * sc);
            pdk.add(rail);
        });
        [-0.68, 0.68].forEach(rx => {
            const sideBar = new THREE.Mesh(new THREE.BoxGeometry(0.08 * sc, 0.08 * sc, 1.04 * sc), pdkYellowMat);
            sideBar.position.set(rx * sc, 0.88 * sc, 0);
            pdk.add(sideBar);
        });

        // Подводные фонтанные арматуры («ёлки») с жёлтыми защитными колпаками и джамперами к манифольду
        const wellOffsets = isLargeSouth
            ? [[-1.35, -0.95], [0.0, -1.15], [1.35, -0.95], [-1.35, 0.95], [0.0, 1.15], [1.35, 0.95]]
            : [[-1.15, -0.82], [1.15, -0.82], [-1.15, 0.82], [1.15, 0.82]];

        wellOffsets.forEach(([wx, wz]) => {
            const wBase = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), concreteBaseMat);
            wBase.position.set(wx, 0.02, wz);
            pdk.add(wBase);

            const xmasTree = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.62, 8), pdkYellowMat);
            xmasTree.position.set(wx, 0.40, wz);
            pdk.add(xmasTree);

            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 8), pdkOrangeMat);
            cap.position.set(wx, 0.74, wz);
            pdk.add(cap);

            // Подводная обвязка (джампер) от фонтанной арматуры к центральному манифольду
            const jCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(wx, 0.36, wz),
                new THREE.Vector3(wx * 0.55, 0.52, wz * 0.55),
                new THREE.Vector3(0, 0.36, 0)
            ]);
            const jumper = new THREE.Mesh(new THREE.TubeGeometry(jCurve, 10, 0.045, 6, false), pdkPipeMat);
            pdk.add(jumper);
        });

        // Пульсирующее кольцо локации (для неработающего Южно-Киринского — красного цвета!)
        const pulse = new THREE.Mesh(
            new THREE.RingGeometry(1.9 * sc, 2.35 * sc, 28),
            new THREE.MeshBasicMaterial({ color: isLargeSouth ? 0xef4444 : 0xfacc15, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
        );
        pulse.rotation.x = -Math.PI / 2;
        pulse.position.y = -0.08;
        pdk.add(pulse);
        subseaPulseNodes.push({ mesh: pulse, phase: isLargeSouth ? 3.8 : 1.1 });

        s1SubseaS3Group.add(pdk);
    }

    // 1. Киринское ПДК (работает) и Южно-Киринское ПДК (в освоении) на морском дне южнее «Лунской-А»
    buildSubseaPdkCluster(143.74, 51.24, false);
    buildSubseaPdkCluster(143.88, 50.96, true);

    // 2. Два РАЗДЕЛЬНЫХ подводных газопровода «Сахалин-3» строго по морскому дну напрямую к БТК:
    //    (А) Действующий газопровод Киринского ГКМ -> БТК S3 (28 км, голубой)
    //    (Б) Отдельная перспективная нитка Южно-Киринского НГКМ -> БТК S3 (не транзитом через Киринское!)
    function addS3SeabedBranch(lonLatList, mat, radius) {
        const rawXZ = lonLatList.map(([lon, lat]) => {
            const [x, z] = lonLatToXZ(lon, lat);
            return new THREE.Vector3(x, 0, z);
        });
        const horizCurve = new THREE.CatmullRomCurve3(rawXZ, false, 'centripetal');
        const samples = horizCurve.getPoints(72);
        const sakhH = samples.map(pt => getSakhalinElevation(pt.x, pt.z));
        const ys = sakhH.map(h => (
            h > -0.12
                ? Math.max(0.28, h + 0.34)
                : Math.max(-2.02, h + 0.26)
        ));
        for (let pass = 0; pass < 2; pass++) {
            const nextY = ys.slice();
            for (let i = 1; i < ys.length - 1; i++) {
                let avg = (ys[i - 1] + ys[i] * 2 + ys[i + 1]) * 0.25;
                if (sakhH[i] > -0.12) {
                    avg = Math.max(avg, sakhH[i] + 0.30, 0.28);
                } else if (sakhH[i] < -2.1) {
                    avg = -2.02;
                }
                nextY[i] = avg;
            }
            for (let i = 1; i < ys.length - 1; i++) ys[i] = nextY[i];
        }
        const pts3d = samples.map((pt, i) => new THREE.Vector3(pt.x, ys[i], pt.z));
        const curve3d = new THREE.CatmullRomCurve3(pts3d, false, 'centripetal');
        const tube = new THREE.Mesh(
            new THREE.TubeGeometry(curve3d, 80, radius, 8, false),
            mat
        );
        s1SubseaS3Group.add(tube);
    }

    // (А) Действующая подводная ветка Киринское ПДК -> БТК «Сахалин-3»
    addS3SeabedBranch([
        [143.74, 51.24],
        [143.54, 51.23],
        [143.34, 51.22],
        [143.18, 51.21],
        [143.08, 51.20]
    ], pdkPipeMat, 0.16);

    // (Б) Самостоятельная перспективная подводная нитка Южно-Киринское НГКМ -> напрямую на БТК «Сахалин-3»
    const pdkSouthPipeMat = new THREE.MeshStandardMaterial({
        color: 0xf87171,
        emissive: 0x991b1b,
        emissiveIntensity: 0.32,
        roughness: 0.36,
        metalness: 0.22,
        transparent: true,
        opacity: 0.78
    });
    addS3SeabedBranch([
        [143.88, 50.96],
        [143.64, 51.02],
        [143.40, 51.09],
        [143.22, 51.15],
        [143.08, 51.20]
    ], pdkSouthPipeMat, 0.14);

    // 3. Двухниточный подводный переход МГП СХВ по дну пролива Невельского (м. Погиби <-> м. Лазарева)
    const subseaShvBrightMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.65,
        roughness: 0.28
    });
    [-0.014, 0.014].forEach(latOff => {
        const nevPts = [
            [141.72, 52.22 + latOff],
            [141.64, 52.225 + latOff],
            [141.58, 52.23 + latOff],
            [141.51, 52.23 + latOff],
            [141.44, 52.23 + latOff]
        ].map(([lon, lat], idx) => {
            const [x, z] = lonLatToXZ(lon, lat);
            const y = (idx === 0 || idx === 4) ? 0.12 : -0.95;
            return new THREE.Vector3(x, y, z);
        });
        const nevCurve = new THREE.CatmullRomCurve3(nevPts, false, 'centripetal');
        const nevTube = new THREE.Mesh(new THREE.TubeGeometry(nevCurve, 28, 0.15, 7, false), subseaShvBrightMat);
        s1SubseaShvGroup.add(nevTube);
    });
    const [nvX, nvZ] = lonLatToXZ(141.58, 52.23);
    const nvPulse = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.45, 22),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    nvPulse.rotation.x = -Math.PI / 2;
    nvPulse.position.set(nvX, -1.72, nvZ);
    s1SubseaShvGroup.add(nvPulse);
    subseaPulseNodes.push({ mesh: nvPulse, phase: 2.7 });
}

