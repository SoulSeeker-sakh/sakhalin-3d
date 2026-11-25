'use strict';

// =========================================================================
// [BLOCK:MODELS_S2]
// 6. 3D-МОДЕЛИ ПЛАТФОРМ, ЗАВОДОВ, МАЯКА, ПРИРОДЫ, ПРИБОЯ, ТАЙГИ И ФЛОТА
// =========================================================================
function addOnshoreFoundation(group, width, depth, maxSkirtDepth = 1.35) {
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 });
    const apronMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.72 });

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.22, maxSkirtDepth, depth + 0.22), concreteMat);
    plinth.position.y = -maxSkirtDepth * 0.5 + 0.04;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    group.add(plinth);

    const apron = new THREE.Mesh(new THREE.BoxGeometry(width + 0.34, 0.14, depth + 0.34), apronMat);
    apron.position.y = 0.07;
    apron.receiveShadow = true;
    group.add(apron);
}

function addFlareBoom(group, startVec, endVec) {
    const dir = new THREE.Vector3().subVectors(endVec, startVec);
    const len = dir.length();
    if (len < 0.01) return;

    const boom = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.04, len, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
    );
    boom.position.copy(startVec).addScaledVector(dir, 0.5);
    boom.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    group.add(boom);

    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.14, 0.38, 10),
        new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    flame.position.copy(endVec).add(new THREE.Vector3(0, 0.14, 0));
    group.add(flame);

    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.6 })
    );
    glow.position.copy(flame.position);
    group.add(glow);

    flareFlames.push({ flame, glow, phase: Math.random() * Math.PI * 2 });
}

function createCleanHelipadAssembly(isOffshore, sideSign = -1) {
    const grp = new THREE.Group();
    grp.userData.tag = isOffshore ? 'helipad-offshore' : 'helipad-onshore';

    const padMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.25 });
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.45 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, flatShading: true });
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const greenLedMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });

    const r = isOffshore ? 0.92 : 0.98;
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, 0.12, 8), padMat);
    grp.add(disk);

    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.64, r * 0.78, 20), yellowMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.068;
    grp.add(ring);

    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, r * 0.78), whiteMat);
    h1.position.set(-r * 0.22, 0.072, 0);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, r * 0.78), whiteMat);
    h2.position.set(r * 0.22, 0.072, 0);
    const h3 = new THREE.Mesh(new THREE.BoxGeometry(r * 0.44, 0.02, 0.08), whiteMat);
    h3.position.set(0, 0.072, 0);
    grp.add(h1, h2, h3);

    for (let k = 0; k < 4; k++) {
        const ang = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), greenLedMat);
        led.position.set(Math.cos(ang) * (r * 0.86), 0.09, Math.sin(ang) * (r * 0.86));
        grp.add(led);
    }

    if (isOffshore) {
        const inward = -sideSign;
        [-0.42, 0.42].forEach(zz => {
            const topBeam = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.09, 0.11), strutMat);
            topBeam.position.set(inward * 0.72, -0.05, zz);
            grp.add(topBeam);

            const diag = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.09, 0.10), strutMat);
            diag.position.set(inward * 0.68, -0.44, zz);
            diag.rotation.z = inward * 0.52;
            grp.add(diag);
        });
    } else {
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.18, 1.35, 8), concreteMat);
        plinth.position.y = -0.73;
        grp.add(plinth);

        const walkway = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.18, 0.65), concreteMat);
        walkway.position.set(1.05, -0.08, 0);
        grp.add(walkway);
    }

    return grp;
}

function buildGravityPlatform3D(group, isLunA) {
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 });
    const iceCollarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.35 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.2 });
    const subDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.3 });
    const accentColor = isLunA ? 0x0ea5e9 : 0xf59e0b;
    const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.35 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 });
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.3 });
    const lifeboatMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 });

    const caissonBase = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.45, 2.15), concreteMat);
    caissonBase.position.y = 0.08;
    group.add(caissonBase);

    const legOffsets = [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]];
    legOffsets.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.33, 1.82, 12), concreteMat);
        leg.position.set(lx, 0.86, lz);
        leg.castShadow = true;
        group.add(leg);

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.34, 12), iceCollarMat);
        collar.position.set(lx, 0.16, lz);
        group.add(collar);
    });

    const underDeck = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.18, 1.84), subDeckMat);
    underDeck.position.y = 1.66;
    group.add(underDeck);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.26, 2.08), deckMat);
    deck.position.y = 1.86;
    deck.castShadow = true;
    group.add(deck);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.06, 2.12), accentMat);
    trim.position.y = 1.98;
    group.add(trim);

    const module1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.58, 1.44), accentMat);
    module1.position.set(-0.54, 2.28, 0);
    module1.castShadow = true;
    group.add(module1);

    const roofCabin = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 1.12), deckMat);
    roofCabin.position.set(-0.54, 2.68, 0);
    roofCabin.castShadow = true;
    group.add(roofCabin);

    const drillFloor = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.22, 0.76), subDeckMat);
    drillFloor.position.set(0.46, 2.10, 0);
    drillFloor.castShadow = true;
    group.add(drillFloor);

    [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]].forEach(([dx, dz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.042, 1.68, 6), steelMat);
        leg.position.set(0.46 + dx * 0.68, 3.0, dz * 0.68);
        leg.rotation.z = dx * 0.42;
        leg.rotation.x = -dz * 0.42;
        leg.castShadow = true;
        group.add(leg);
    });

    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.24), accentMat);
    crown.position.set(0.46, 3.84, 0);
    group.add(crown);

    const helipad = createCleanHelipadAssembly(true, -1);
    helipad.position.set(-2.01, 2.07, 0.12);
    group.add(helipad);

    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    [2.55, 3.05, 3.50].forEach((ty, idx) => {
        const span = 0.50 - idx * 0.10;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(span, 0.035, span), steelMat);
        frame.position.set(0.46, ty, 0);
        detailGroup.add(frame);
    });
    const monkeyBoard = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.24), accentMat);
    monkeyBoard.position.set(0.62, 3.22, 0);
    detailGroup.add(monkeyBoard);
    const drillPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.62, 6), craneMat);
    drillPipe.position.set(0.46, 3.0, 0);
    detailGroup.add(drillPipe);

    const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    beacon.position.set(0.46, 3.96, 0);
    detailGroup.add(beacon);
    platformBeacons.push({ mesh: beacon, phase: Math.random() * Math.PI * 2 });

    [-0.42, 0.0, 0.42].forEach(wz => {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.24), windowMat);
        w1.position.set(-1.02, 2.38, wz);
        detailGroup.add(w1);

        const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.24), windowMat);
        w2.position.set(-1.02, 2.18, wz);
        detailGroup.add(w2);
    });



    const cranePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.13, 0.42, 10), craneMat);
    cranePedestal.position.set(0.02, 2.20, 0.78);
    detailGroup.add(cranePedestal);
    const craneCab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.24), subDeckMat);
    craneCab.position.set(0.02, 2.46, 0.78);
    detailGroup.add(craneCab);
    const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 1.38), craneMat);
    craneBoom.position.set(0.32, 2.86, 1.18);
    craneBoom.rotation.y = 0.42;
    craneBoom.rotation.x = -0.46;
    detailGroup.add(craneBoom);

    [-0.22, 0.22].forEach(bz => {
        const boat = new THREE.Mesh(createCapsuleGeometry(0.08, 0.24, 8), lifeboatMat);
        boat.rotation.z = Math.PI / 2;
        boat.position.set(-1.08, 1.96, bz);
        detailGroup.add(boat);
    });

    [-0.45, 0.45].forEach(vz => {
        const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.54, 10), deckMat);
        vessel.rotation.z = Math.PI / 2;
        vessel.position.set(0.05, 2.12, vz);
        detailGroup.add(vessel);
    });
    [-0.36, 0.36].forEach(ez => {
        const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.62, 8), subDeckMat);
        exhaust.position.set(-0.22, 2.85, ez);
        detailGroup.add(exhaust);
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.55, 6), steelMat);
    mast.position.set(-0.62, 3.04, -0.35);
    detailGroup.add(mast);
    const radarPivot = new THREE.Group();
    radarPivot.position.set(-0.62, 3.30, -0.35);
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, 0.05), deckMat);
    radarPivot.add(radarBar);
    detailGroup.add(radarPivot);
    platformRadars.push({ pivot: radarPivot, speed: 2.2 });

    const railFront = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.05, 0.03), railMat);
    railFront.position.set(0, 2.06, 1.03);
    const railBack = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.05, 0.03), railMat);
    railBack.position.set(0, 2.06, -1.03);
    const railRight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 2.08), railMat);
    railRight.position.set(1.18, 2.06, 0);
    detailGroup.add(railFront, railBack, railRight);

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 68 * 68 });

    addFlareBoom(group, new THREE.Vector3(0.92, 2.02, -0.72), new THREE.Vector3(1.68, 3.05, -1.28));
}

function buildMolikpaq3D(group) {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.35 });
    const iceBeltMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.45 });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 });
    const derrickSteelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 });
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.3 });
    const lifeboatMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 });

    const caisson = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.46, 1.56, 8), steelMat);
    caisson.position.y = 0.78;
    caisson.castShadow = true;
    group.add(caisson);

    const iceBelt = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.48, 0.36, 8), iceBeltMat);
    iceBelt.position.y = 0.18;
    group.add(iceBelt);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.26, 2.22), deckMat);
    deck.position.y = 1.68;
    deck.castShadow = true;
    group.add(deck);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.06, 2.26), accentMat);
    trim.position.y = 1.80;
    group.add(trim);

    const quarters = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.58, 1.32), accentMat);
    quarters.position.set(-0.52, 2.10, 0.08);
    quarters.castShadow = true;
    group.add(quarters);

    const topBridge = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.20, 0.96), deckMat);
    topBridge.position.set(-0.52, 2.48, 0.08);
    group.add(topBridge);

    [[-0.20, -0.20], [0.20, -0.20], [-0.20, 0.20], [0.20, 0.20]].forEach(([dx, dz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.62, 6), derrickSteelMat);
        leg.position.set(0.44 + dx * 0.66, 2.66, dz * 0.66);
        leg.rotation.z = dx * 0.42;
        leg.rotation.x = -dz * 0.42;
        leg.castShadow = true;
        group.add(leg);
    });
    const crown = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.22), accentMat);
    crown.position.set(0.44, 3.48, 0);
    group.add(crown);

    const helipad = createCleanHelipadAssembly(true, -1);
    helipad.position.set(-1.93, 1.89, 0.12);
    group.add(helipad);

    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    [2.25, 2.72, 3.15].forEach((ty, idx) => {
        const span = 0.46 - idx * 0.09;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(span, 0.035, span), derrickSteelMat);
        frame.position.set(0.44, ty, 0);
        detailGroup.add(frame);
    });
    const drillPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.56, 6), craneMat);
    drillPipe.position.set(0.44, 2.66, 0);
    detailGroup.add(drillPipe);

    const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    beacon.position.set(0.44, 3.59, 0);
    detailGroup.add(beacon);
    platformBeacons.push({ mesh: beacon, phase: Math.random() * Math.PI * 2 });

    [-0.32, 0.08, 0.48].forEach(wz => {
        const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.22), windowMat);
        w1.position.set(-0.96, 2.20, wz);
        detailGroup.add(w1);
        const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.10, 0.22), windowMat);
        w2.position.set(-0.96, 2.00, wz);
        detailGroup.add(w2);
    });



    const cranePed = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.38, 10), craneMat);
    cranePed.position.set(0.0, 2.0, 0.84);
    detailGroup.add(cranePed);
    const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.28), craneMat);
    craneBoom.position.set(0.30, 2.52, 1.22);
    craneBoom.rotation.y = 0.42;
    craneBoom.rotation.x = -0.45;
    detailGroup.add(craneBoom);

    [-0.18, 0.22].forEach(bz => {
        const boat = new THREE.Mesh(createCapsuleGeometry(0.075, 0.22, 8), lifeboatMat);
        boat.rotation.z = Math.PI / 2;
        boat.position.set(-1.02, 1.80, bz);
        detailGroup.add(boat);
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.50, 6), derrickSteelMat);
    mast.position.set(-0.56, 2.82, -0.26);
    detailGroup.add(mast);
    const radarPivot = new THREE.Group();
    radarPivot.position.set(-0.56, 3.06, -0.26);
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.05), deckMat);
    radarPivot.add(radarBar);
    detailGroup.add(radarPivot);
    platformRadars.push({ pivot: radarPivot, speed: -2.0 });

    const railFront = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.05, 0.03), railMat);
    railFront.position.set(0, 1.88, 1.10);
    const railBack = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.05, 0.03), railMat);
    railBack.position.set(0, 1.88, -1.10);
    detailGroup.add(railFront, railBack);

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 68 * 68 });

    addFlareBoom(group, new THREE.Vector3(0.82, 1.86, -0.76), new THREE.Vector3(1.52, 2.82, -1.26));
}

function buildLngPlant3D(group) {
    // =========================================================================
    // ЕДИНЫЙ МОНОЛИТНЫЙ ПК «ПРИГОРОДНОЕ» (ЗАВОД СПГ + ТОН + ТОНКИЙ МОСТ СПГ + СЛУЖЕБНЫЙ ПИРС + ВПУ)
    // Компоновка по реальному аэрофото: всё на одном ровном участке лицом к заливу Анива (+Z)
    // =========================================================================
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, flatShading: true });
    const padSurfaceMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72, metalness: 0.18 });
    const tankMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.34, metalness: 0.14 });
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.36 });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.46 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.5, roughness: 0.4 });
    const lngAccentMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.4 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.22 });
    const blackHoseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const winGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.0 });
    s2Runtime.tonNightMats.push(winGlowMat);

    // 1. УГЛУБЛЁННЫЙ НИЗКИЙ ЕДИНЫЙ ФУНДАМЕНТ (уходит в берег, не торчит высокой стеной над водой!)
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(5.10, 2.2, 2.55), concreteMat);
    basePlinth.position.set(0, -1.04, 0);
    basePlinth.castShadow = true;
    basePlinth.receiveShadow = true;
    group.add(basePlinth);

    const padTop = new THREE.Mesh(new THREE.BoxGeometry(5.18, 0.08, 2.62), padSurfaceMat);
    padTop.position.set(0, 0.08, 0);
    padTop.receiveShadow = true;
    group.add(padTop);

    // 2. ЗАПАДНАЯ ПОЛОВИНА ПЛОЩАДКИ (x < 0): ЗАВОД СПГ (2 белых купольных резервуара + 2 линии сжижения + факел)
    [-1.92, -1.04].forEach(tx => {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.68, 18), tankMat);
        tank.position.set(tx, 0.48, -0.45);
        tank.castShadow = true;
        group.add(tank);

        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(0.38, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
            domeMat
        );
        dome.position.set(tx, 0.82, -0.45);
        group.add(dome);
    });

    // Две технологические линии СПГ (смотрят ровно к морю, без поворотов)
    const train1 = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.44, 0.66), plantMat);
    train1.position.set(-0.62, 0.36, 0.42);
    train1.castShadow = true;
    group.add(train1);

    const train2 = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.38, 0.62), pipeMat);
    train2.position.set(-1.74, 0.33, 0.44);
    train2.castShadow = true;
    group.add(train2);

    // Факельная башня между технологическими линиями и резервуарами ТОН
    addFlareBoom(group, new THREE.Vector3(-0.02, 0.38, -0.58), new THREE.Vector3(0.12, 1.62, -0.78));

    // 3. ВОСТОЧНАЯ ПОЛОВИНА ПЛОЩАДКИ (x > 0): ТЕРМИНАЛ ОТГРУЗКИ НЕФТИ (ТОН — в ту же сторону!)
    [0.86, 1.88].forEach(tx => {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.64, 16), tankMat);
        body.position.set(tx, 0.46, -0.42);
        body.castShadow = true;
        group.add(body);

        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.462, 0.462, 0.12, 16), orangeMat);
        band.position.set(tx, 0.64, -0.42);
        group.add(band);

        const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.05, 16), concreteMat);
        roof.position.set(tx, 0.80, -0.42);
        group.add(roof);
    });

    const pumpHouse = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.46, 0.72), tankMat);
    pumpHouse.position.set(1.36, 0.37, 0.46);
    pumpHouse.castShadow = true;
    group.add(pumpHouse);

    const pumpRoof = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.78), orangeMat);
    pumpRoof.position.set(1.36, 0.63, 0.46);
    group.add(pumpRoof);

    const pumpWin = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.11, 0.44), winGlowMat);
    pumpWin.position.set(1.36, 0.42, 0.46);
    group.add(pumpWin);

    // Соединительная эстакада-трубопровод между СПГ и ТОН внутри единой площадки
    const linkRack = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 8), pipeMat);
    linkRack.rotation.z = Math.PI / 2;
    linkRack.position.set(0.25, 0.45, 0.05);
    group.add(linkRack);

    // 4. ТОНКИЙ РЕАЛИСТИЧНЫЙ МОСТ-ПРИЧАЛ СПГ (как на реальном аэрофото Пригородного!)
    //    Узкая длинная эстакада без громоздкой плиты посередине + лёгкие боковые швартовные мостики с изломом
    const jettyGroup = new THREE.Group();
    jettyGroup.userData.tag = 'lng-jetty';
    const jettyX = -1.10;
    const jettyLen = 4.95;
    const jettyStartZ = 1.25;
    const jettyEndZ = jettyStartZ + jettyLen;
    const jettyLocalY = -group.position.y;

    const jDeckMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65, metalness: 0.25 });
    const jPileMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75 });
    const jCryoMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.24, roughness: 0.35 });

    // Тонкий настил эстакады СПГ (0.28 вместо громоздкой 0.58)
    const span = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, jettyLen), jDeckMat);
    span.position.set(jettyX, jettyLocalY + 0.36, jettyStartZ + jettyLen * 0.5);
    jettyGroup.add(span);

    // Две аккуратные тонкие криогенные нитки вдоль моста
    [-0.065, 0.065].forEach(ox => {
        const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, jettyLen + 0.15, 6), jCryoMat);
        cp.rotation.x = Math.PI / 2;
        cp.position.set(jettyX + ox, jettyLocalY + 0.42, jettyStartZ + jettyLen * 0.5);
        jettyGroup.add(cp);
    });

    // Тонкие сваи-опоры вдоль всей длины эстакады
    for (let p = 0; p < 6; p++) {
        const pz = jettyStartZ + 0.55 + p * 0.85;
        [-0.11, 0.11].forEach(ox => {
            const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.54, 6), jPileMat);
            pile.position.set(jettyX + ox, jettyLocalY + 0.12, pz);
            jettyGroup.add(pile);
        });
    }

    // Компактная головная технологическая площадка со стендерами на конце эстакады
    const headPad = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.12, 0.56), jDeckMat);
    headPad.position.set(jettyX, jettyLocalY + 0.38, jettyEndZ);
    jettyGroup.add(headPad);

    [-0.16, 0, 0.16].forEach(ax => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.36, 0.06), yellowMat);
        arm.position.set(jettyX + ax, jettyLocalY + 0.60, jettyEndZ + 0.08);
        arm.rotation.x = 0.20;
        jettyGroup.add(arm);
    });

    // Пара фирменных жёлтых технических модулей на эстакаде (как на реальном фото причала СПГ!)
    [-0.16, 0.16].forEach(bx => {
        const mod = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.42), yellowMat);
        mod.position.set(jettyX + bx, jettyLocalY + 0.45, jettyStartZ + jettyLen * 0.48);
        jettyGroup.add(mod);
    });

    // Реальная асимметричная схема кончика причала СПГ (по фото):
    // 1) От самого конца моста уходит тонкий мостик ВЛЕВО (на восток +X) с лёгким изломом и 2 палами
    // 2) Чуть БЛИЖЕ К БЕРЕГУ (на стволе моста) отходит второе тонкое крыло ВПРАВО (на запад -X) вдоль кормы газовоза!
    const buildMooringArm = (pointsXZ) => {
        for (let i = 0; i < pointsXZ.length - 1; i++) {
            const [ax, az] = pointsXZ[i];
            const [bx, bz] = pointsXZ[i + 1];
            const segLen = Math.hypot(bx - ax, bz - az);
            const seg = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.05, segLen), jPileMat);
            seg.position.set((ax + bx) * 0.5, jettyLocalY + 0.33, (az + bz) * 0.5);
            seg.rotation.y = Math.atan2(bx - ax, bz - az);
            jettyGroup.add(seg);

            const dol = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 0.50, 8), jPileMat);
            dol.position.set(bx, jettyLocalY + 0.15, bz);
            jettyGroup.add(dol);
        }
    };
    // Переднее швартовное крыло — идеально прямая линия вперёд в море (+Z) по оси моста
    buildMooringArm([
        [jettyX, jettyEndZ + 0.26],
        [jettyX, jettyEndZ + 1.08],
        [jettyX, jettyEndZ + 1.92]
    ]);
    // Заднее швартовное крыло — аккуратный Г-отвод и идеально прямая линия параллельно стволу моста к жёлтым модулям
    buildMooringArm([
        [jettyX - 0.30, jettyEndZ],
        [jettyX - 0.44, jettyEndZ],
        [jettyX - 0.44, jettyEndZ - 0.92],
        [jettyX - 0.44, jettyEndZ - 1.84]
    ]);

    // 5. СЛУЖЕБНЫЙ ПИРС ПОРТФЛОТА СПРАВА (ровный аккуратный пирс правее моста СПГ)
    const srvLen = 2.00;
    const srvX = 1.25;
    const srvZ = jettyStartZ + srvLen * 0.5;
    const srvPier = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, srvLen), jDeckMat);
    srvPier.position.set(srvX, jettyLocalY + 0.28, srvZ);
    srvPier.rotation.y = 0.06;
    jettyGroup.add(srvPier);

    for (let sp = 0; sp < 3; sp++) {
        const frac = (sp + 0.5) / 3;
        const px = srvX + Math.sin(0.06) * (frac - 0.5) * srvLen;
        const pz = srvZ + Math.cos(0.06) * (frac - 0.5) * srvLen;
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.44, 6), jPileMat);
        pile.position.set(px, jettyLocalY + 0.08, pz);
        jettyGroup.add(pile);
    }

    group.add(jettyGroup);

    // 6. ДЕТАЛИЗАЦИЯ LOD (полосы на резервуарах, колонны ректификации, прожекторы)
    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    [-1.92, -1.04].forEach(tx => {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.07, 18), lngAccentMat);
        band.position.set(tx, 0.66, -0.45);
        detailGroup.add(band);

        const stair = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.68, 0.09), pipeMat);
        stair.position.set(tx + 0.39, 0.48, -0.45);
        detailGroup.add(stair);
    });

    [-0.86, -0.42].forEach(cx => {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 1.18, 12), domeMat);
        col.position.set(cx, 0.72, 0.36);
        col.castShadow = true;
        detailGroup.add(col);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), plantMat);
        cap.position.set(cx, 1.30, 0.36);
        detailGroup.add(cap);
    });

    const winStrip = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.03), windowMat);
    winStrip.position.set(-1.74, 0.38, 0.76);
    detailGroup.add(winStrip);

    [[-2.35, -1.05], [2.35, -1.05], [-2.35, 1.05], [2.35, 1.05]].forEach(([mx, mz]) => {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.92, 6), pipeMat);
        mast.position.set(mx, 0.58, mz);
        detailGroup.add(mast);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.045, 0.055), windowMat);
        lamp.position.set(mx, 1.04, mz);
        detailGroup.add(lamp);
    });

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 70 * 70 });

    // 7. ВЫНОСНОЕ ПРИЧАЛЬНОЕ УСТРОЙСТВО (ВПУ ТОН) — СДВИНУТО ПРАВЕЕ И ПОДАЛЬШЕ В МОРЕ ОТ МОСТА СПГ!
    const [spmX, spmZ] = lonLatToXZ(143.18, 46.34);
    s2Runtime.tonSpmPos = new THREE.Vector3(spmX, 0.14, spmZ);

    const spmGroup = new THREE.Group();
    spmGroup.userData.tag = 'ton-spm';
    spmGroup.position.set(spmX, 0.0, spmZ);
    // Уменьшаем масштаб башни ВПУ до соразмерного и аккуратного по отношению к танкеру!
    spmGroup.scale.setScalar(0.54);

    const coneBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.84, 0.82, 12), yellowMat);
    coneBase.position.y = 0.34;
    spmGroup.add(coneBase);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.08, 12), yellowMat);
    column.position.y = 1.22;
    spmGroup.add(column);

    const turntable = new THREE.Group();
    turntable.position.y = 1.82;
    turntable.rotation.y = -2.35;
    spmGroup.add(turntable);
    s2Runtime.tonSpmTurntable = turntable;

    const deckBox = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.44, 1.06), yellowMat);
    deckBox.position.set(0, 0.22, 0);
    turntable.add(deckBox);

    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.58), tankMat);
    cab.position.set(0, 0.58, -0.16);
    turntable.add(cab);

    const boomL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 2.20), yellowMat);
    boomL.position.set(-0.16, 0.62, 1.18);
    boomL.rotation.x = -0.22;
    turntable.add(boomL);
    const boomR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 2.20), yellowMat);
    boomR.position.set(0.16, 0.62, 1.18);
    boomR.rotation.x = -0.22;
    turntable.add(boomR);
    const boomTip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.24), orangeMat);
    boomTip.position.set(0, 0.86, 2.20);
    turntable.add(boomTip);

    const hoseCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0.82, 2.20),
        new THREE.Vector3(0, 0.16, 2.90),
        new THREE.Vector3(0, 0.08, 3.85)
    );
    turntable.add(new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 14, 0.06, 6, false), blackHoseMat));

    const hawserCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0.20, 0.50),
        new THREE.Vector3(0.16, 0.09, 1.95),
        new THREE.Vector3(0.05, 0.07, 3.60)
    );
    turntable.add(new THREE.Mesh(new THREE.TubeGeometry(hawserCurve, 12, 0.03, 5, false), yellowMat));

    const spmBeaconMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 });
    const spmBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), spmBeaconMat);
    spmBeacon.position.set(0, 0.84, -0.16);
    turntable.add(spmBeacon);
    s2Runtime.tonSpmBeacons.push(spmBeaconMat);

    sakhalin2Group.add(spmGroup);
}

function buildOilTerminal3D(group) {
    // Объединено внутрь единого ПК «Пригородное» (buildLngPlant3D)
}

function buildOnshoreComplex3D(group, isObtk) {
    addOnshoreFoundation(group, isObtk ? 2.4 : 2.05, isObtk ? 1.9 : 1.7);

    const buildingMat = new THREE.MeshStandardMaterial({ color: isObtk ? 0xea580c : 0xd97706, roughness: 0.45 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const stackMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.4 });

    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.50, 1.02), buildingMat);
    mainHall.position.set(-0.14, 0.43, 0);
    mainHall.castShadow = true;
    group.add(mainHall);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 1.06), roofMat);
    roof.position.set(-0.14, 0.70, 0);
    group.add(roof);

    [-0.44, 0.06].forEach(sx => {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.12, 10), stackMat);
        stack.position.set(sx, 0.94, -0.28);
        stack.castShadow = true;
        group.add(stack);
    });

    if (isObtk) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.46, 16), roofMat);
        tank.position.set(0.80, 0.41, 0.24);
        tank.castShadow = true;
        group.add(tank);

        const obtkPad = createCleanHelipadAssembly(false, -1);
        obtkPad.position.set(-2.65, 0.18, 0.10);
        group.add(obtkPad);
    }

    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    [-0.54, -0.14, 0.26].forEach(wx => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.11, 0.03), windowMat);
        win.position.set(wx, 0.48, 0.52);
        detailGroup.add(win);
    });

    [-0.42, 0.14].forEach(vx => {
        const hvac = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.28), stackMat);
        hvac.position.set(vx, 0.80, 0.18);
        detailGroup.add(hvac);
    });

    if (isObtk) {
        const tankRing = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 16), buildingMat);
        tankRing.position.set(0.80, 0.56, 0.24);
        detailGroup.add(tankRing);

        const slugCatcher = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.72, 10), roofMat);
        slugCatcher.rotation.z = Math.PI / 2;
        slugCatcher.position.set(0.76, 0.30, -0.38);
        detailGroup.add(slugCatcher);
    } else {
        [-0.28, 0.28].forEach(cz => {
            const comp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.24), accentMat);
            comp.position.set(0.78, 0.30, cz);
            detailGroup.add(comp);
        });
    }

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.92, 6), stackMat);
    antenna.position.set(-0.98, 0.64, -0.58);
    detailGroup.add(antenna);
    const antBeacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    antBeacon.position.set(-0.98, 1.12, -0.58);
    detailGroup.add(antBeacon);
    platformBeacons.push({ mesh: antBeacon, phase: isObtk ? 0.5 : 1.7 });

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 66 * 66 });
}

function buildValveStation3D(group) {
    addOnshoreFoundation(group, 1.5, 1.3);

    const boxMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.5, roughness: 0.4 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

    const station = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.42, 0.82), boxMat);
    station.position.set(0, 0.39, 0);
    station.castShadow = true;
    group.add(station);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.08, 0.88), roofMat);
    roof.position.set(0, 0.62, 0);
    group.add(roof);

    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    const win = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.10, 0.03), windowMat);
    win.position.set(0, 0.44, 0.42);
    detailGroup.add(win);

    [-0.25, 0.25].forEach(vx => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8), greenMat);
        pipe.position.set(vx, 0.32, -0.54);
        detailGroup.add(pipe);
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), boxMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(vx, 0.48, -0.54);
        detailGroup.add(wheel);
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.78, 6), steelMat);
    mast.position.set(-0.56, 0.56, -0.44);
    detailGroup.add(mast);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.04, 0.06, 10), roofMat);
    dish.rotation.x = Math.PI / 3;
    dish.position.set(-0.56, 0.84, -0.40);
    detailGroup.add(dish);

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 62 * 62 });
}

function buildAnivaLighthouse3D(group) {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.92, 1), rockMat);
    rock.scale.set(1.2, 0.65, 1.0);
    rock.position.y = 0.24;
    rock.castShadow = true;
    group.add(rock);

    const annex = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.56, 0.90), baseMat);
    annex.position.set(-0.18, 0.70, 0);
    annex.castShadow = true;
    group.add(annex);

    const lowerTower = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.30, 0.84, 14), whiteMat);
    lowerTower.position.set(0.16, 0.94, 0);
    lowerTower.castShadow = true;
    group.add(lowerTower);

    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.44, 14), redMat);
    stripe.position.set(0.16, 1.56, 0);
    group.add(stripe);

    const upperTower = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.44, 14), whiteMat);
    upperTower.position.set(0.16, 2.00, 0);
    group.add(upperTower);

    const lantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.26, 12),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 })
    );
    lantern.position.set(0.16, 2.36, 0);
    group.add(lantern);

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), redMat);
    dome.position.set(0.16, 2.49, 0);
    group.add(dome);

    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.05, 16), darkMat);
    gallery.position.set(0.16, 2.22, 0);
    detailGroup.add(gallery);
    const galleryRail = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.014, 6, 18), whiteMat);
    galleryRail.rotation.x = Math.PI / 2;
    galleryRail.position.set(0.16, 2.28, 0);
    detailGroup.add(galleryRail);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.26, 6), whiteMat);
    spire.position.set(0.16, 2.74, 0);
    detailGroup.add(spire);

    [1.12, 1.88].forEach(wy => {
        const tWin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), windowMat);
        tWin.position.set(0.16, wy, 0.24);
        detailGroup.add(tWin);
    });
    [-0.22, 0.22].forEach(az => {
        const aWin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.12), windowMat);
        aWin.position.set(-0.52, 0.74, az);
        detailGroup.add(aWin);
    });

    [[0.85, 0.55], [-0.82, -0.52], [0.42, -0.78]].forEach(([rx, rz]) => {
        const subRock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), rockMat);
        subRock.scale.set(1.2, 0.55, 1.0);
        subRock.position.set(rx, 0.08, rz);
        detailGroup.add(subRock);
    });

    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 65 * 65 });

}

function buildVessel3D(group, shipType) {
    const isTanker = shipType === 'oil-tanker';
    const isLng = shipType === 'lng-carrier';
    const length = isTanker ? 2.5 : (isLng ? 2.6 : 1.72);
    const width = isTanker ? 0.56 : (isLng ? 0.60 : 0.44);

    const hullColor = isTanker ? 0x991b1b : (isLng ? 0x0f172a : 0x1d4ed8);
    const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.45, metalness: 0.25 });
    const deckMat = new THREE.MeshStandardMaterial({ color: isTanker ? 0x7f1d1d : 0x334155, roughness: 0.6 });
    const superStructMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const lifeboatMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

    const hullZ = -length * 0.14;
    const hullLen = length * 0.72;
    const bowBaseZ = hullZ + hullLen * 0.5;
    const bowLen = length * 0.30;
    const halfW = width * 0.5;

    const hull = new THREE.Mesh(new THREE.BoxGeometry(width, 0.34, hullLen), hullMat);
    hull.position.set(0, 0.16, hullZ);
    hull.castShadow = true;
    group.add(hull);

    // Профилированный нос строго по оси +Z (направлению движения)
    const bowShape = new THREE.Shape();
    bowShape.moveTo(-halfW, 0);
    bowShape.quadraticCurveTo(-halfW * 0.82, bowLen * 0.62, 0, bowLen);
    bowShape.quadraticCurveTo(halfW * 0.82, bowLen * 0.62, halfW, 0);
    bowShape.closePath();

    const bowGeo = new THREE.ExtrudeGeometry(bowShape, {
        depth: 0.36,
        bevelEnabled: false,
        curveSegments: 10
    });
    bowGeo.rotateX(Math.PI / 2);
    const bow = new THREE.Mesh(bowGeo, hullMat);
    bow.position.set(0, 0.35, bowBaseZ);
    bow.castShadow = true;
    group.add(bow);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(width * 0.94, 0.06, hullLen * 0.98), deckMat);
    deck.position.set(0, 0.35, hullZ);
    group.add(deck);

    const bowDeckGeo = new THREE.ExtrudeGeometry(bowShape, {
        depth: 0.05,
        bevelEnabled: false,
        curveSegments: 10
    });
    bowDeckGeo.rotateX(Math.PI / 2);
    const bowDeck = new THREE.Mesh(bowDeckGeo, deckMat);
    bowDeck.scale.set(0.94, 1, 0.96);
    bowDeck.position.set(0, 0.385, bowBaseZ);
    group.add(bowDeck);

    const detailGroup = new THREE.Group();
    group.add(detailGroup);

    const wakeMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.36,
        side: THREE.DoubleSide
    });
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.15, length * 0.95), wakeMat);
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(0, 0.01, -length * 0.82);
    detailGroup.add(wake);
    group.userData.wakeMat = wakeMat;

    const portLight = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    const stbdLight = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), new THREE.MeshBasicMaterial({ color: 0x34d399 }));
    const mastLight = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfef9c3 }));

    const bowMast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 0.38, 6), superStructMat);
    bowMast.position.set(0, 0.56, bowBaseZ + bowLen * 0.42);
    const anchorWinch = new THREE.Mesh(new THREE.BoxGeometry(width * 0.44, 0.09, 0.14), darkMat);
    anchorWinch.position.set(0, 0.42, bowBaseZ + bowLen * 0.18);
    detailGroup.add(bowMast, anchorWinch);

    if (isTanker) {
        const pipe = new THREE.Mesh(
            new THREE.CylinderGeometry(0.035, 0.035, hullLen * 0.72, 8),
            yellowMat
        );
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(0, 0.42, hullZ + 0.12);
        group.add(pipe);

        const bridge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.56, 0.46), superStructMat);
        bridge.position.set(0, 0.66, hullZ - hullLen * 0.32);
        bridge.castShadow = true;
        group.add(bridge);

        const funnel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.22), hullMat);
        funnel.position.set(0, 1.02, hullZ - hullLen * 0.40);
        group.add(funnel);

        const bridgeWings = new THREE.Mesh(new THREE.BoxGeometry(width * 1.12, 0.08, 0.14), superStructMat);
        bridgeWings.position.set(0, 0.84, hullZ - hullLen * 0.26);
        const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.08, 0.03), windowMat);
        bridgeWin.position.set(0, 0.84, hullZ - hullLen * 0.18);
        const manifold = new THREE.Mesh(new THREE.BoxGeometry(width * 0.86, 0.12, 0.18), yellowMat);
        manifold.position.set(0, 0.43, hullZ + 0.08);
        const hoseCrane = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.06), yellowMat);
        hoseCrane.position.set(width * 0.28, 0.54, hullZ + 0.08);
        detailGroup.add(bridgeWings, bridgeWin, manifold, hoseCrane);

        [-1, 1].forEach(side => {
            const boat = new THREE.Mesh(createCapsuleGeometry(0.045, 0.14, 6), lifeboatMat);
            boat.rotation.x = Math.PI / 2;
            boat.position.set(side * (width * 0.46), 0.64, hullZ - hullLen * 0.32);
            detailGroup.add(boat);
        });

        const radarPivot = new THREE.Group();
        radarPivot.position.set(0, 0.98, hullZ - hullLen * 0.28);
        radarPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.04), superStructMat));
        detailGroup.add(radarPivot);
        platformRadars.push({ pivot: radarPivot, speed: 2.6 });

        portLight.position.set(-width * 0.56, 0.86, hullZ - hullLen * 0.26);
        stbdLight.position.set(width * 0.56, 0.86, hullZ - hullLen * 0.26);
        mastLight.position.set(0, 1.24, hullZ - hullLen * 0.40);
    } else if (isLng) {
        const sphereMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.15 });
        const equatorMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.35 });
        const tankZ = [hullZ - 0.48, hullZ - 0.04, hullZ + 0.40, hullZ + 0.78];

        tankZ.forEach(sz => {
            const tank = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), sphereMat);
            tank.position.set(0, 0.46, sz);
            tank.castShadow = true;
            group.add(tank);

            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.212, 0.016, 6, 16), equatorMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(0, 0.46, sz);
            detailGroup.add(ring);
        });

        const catwalk = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, hullLen * 0.74), superStructMat);
        catwalk.position.set(0, 0.69, hullZ + 0.14);
        detailGroup.add(catwalk);

        const bridge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.56, 0.48), superStructMat);
        bridge.position.set(0, 0.70, hullZ - hullLen * 0.38);
        bridge.castShadow = true;
        group.add(bridge);

        const funnel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.22), equatorMat);
        funnel.position.set(0, 1.06, hullZ - hullLen * 0.44);
        group.add(funnel);

        const bridgeWings = new THREE.Mesh(new THREE.BoxGeometry(width * 1.12, 0.08, 0.14), superStructMat);
        bridgeWings.position.set(0, 0.88, hullZ - hullLen * 0.32);
        const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.08, 0.03), windowMat);
        bridgeWin.position.set(0, 0.88, hullZ - hullLen * 0.24);
        detailGroup.add(bridgeWings, bridgeWin);

        [-1, 1].forEach(side => {
            const boat = new THREE.Mesh(createCapsuleGeometry(0.045, 0.14, 6), lifeboatMat);
            boat.rotation.x = Math.PI / 2;
            boat.position.set(side * (width * 0.46), 0.68, hullZ - hullLen * 0.38);
            detailGroup.add(boat);
        });

        const radarPivot = new THREE.Group();
        radarPivot.position.set(0, 1.02, hullZ - hullLen * 0.34);
        radarPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.04), superStructMat));
        detailGroup.add(radarPivot);
        platformRadars.push({ pivot: radarPivot, speed: -2.4 });

        portLight.position.set(-width * 0.56, 0.90, hullZ - hullLen * 0.32);
        stbdLight.position.set(width * 0.56, 0.90, hullZ - hullLen * 0.32);
        mastLight.position.set(0, 1.28, hullZ - hullLen * 0.44);
    } else {
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.52, 0.62), superStructMat);
        bridge.position.set(0, 0.68, hullZ + hullLen * 0.18);
        bridge.castShadow = true;
        group.add(bridge);

        const helipad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.30, 0.30, 0.06, 14),
            darkMat
        );
        helipad.position.set(0, 0.96, hullZ + hullLen * 0.28);
        group.add(helipad);

        [-0.14, 0.14].forEach(fx => {
            const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.42, 8), hullMat);
            stack.position.set(fx, 0.85, hullZ - 0.06);
            group.add(stack);
        });

        const heliRing = new THREE.Mesh(
            new THREE.RingGeometry(0.20, 0.24, 16),
            new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
        );
        heliRing.rotation.x = -Math.PI / 2;
        heliRing.position.set(0, 0.992, hullZ + hullLen * 0.28);
        const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.08, 0.03), windowMat);
        bridgeWin.position.set(0, 0.82, hullZ + hullLen * 0.43);
        const cargo1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.28), lifeboatMat);
        cargo1.position.set(-0.08, 0.46, hullZ - hullLen * 0.24);
        const cargo2 = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, 0.26), yellowMat);
        cargo2.position.set(0.10, 0.45, hullZ - hullLen * 0.34);
        const deckCrane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.34), yellowMat);
        deckCrane.position.set(0.14, 0.56, hullZ - hullLen * 0.12);
        detailGroup.add(heliRing, bridgeWin, cargo1, cargo2, deckCrane);

        const radarPivot = new THREE.Group();
        radarPivot.position.set(0, 0.98, hullZ + hullLen * 0.05);
        radarPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.04), superStructMat));
        detailGroup.add(radarPivot);
        platformRadars.push({ pivot: radarPivot, speed: 2.8 });

        portLight.position.set(-width * 0.44, 0.84, hullZ + hullLen * 0.34);
        stbdLight.position.set(width * 0.44, 0.84, hullZ + hullLen * 0.34);
        mastLight.position.set(0, 1.12, hullZ - 0.06);
    }

    detailGroup.add(portLight, stbdLight, mastLight);
    platformDetailLods.push({ parent: group, detail: detailGroup, thresholdSq: 64 * 64 });
}

