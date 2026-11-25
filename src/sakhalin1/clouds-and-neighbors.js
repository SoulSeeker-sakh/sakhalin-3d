'use strict';

const _s1BdDaySummer = new THREE.Color(0x354a43);
const _s1BdDayWinter = new THREE.Color(0x7c94aa);
const _s1BdNightSummer = new THREE.Color(0x1c332c);
const _s1BdNightWinter = new THREE.Color(0x2f4354);
const _s1BdTmpDay = new THREE.Color();
const _s1BdTmpNight = new THREE.Color();

function updateFarEastBackdropColor() {
    if (!s1BackdropMat) return;
    const rawW = (typeof winterMix !== 'undefined') ? winterMix : (isWinterMode ? 1.0 : 0.0);
    const wMix = rawW * rawW * (3.0 - 2.0 * rawW);
    _s1BdTmpDay.copy(_s1BdDaySummer).lerp(_s1BdDayWinter, wMix);
    _s1BdTmpNight.copy(_s1BdNightSummer).lerp(_s1BdNightWinter, wMix);
    s1BackdropMat.color.copy(_s1BdTmpDay).lerp(_s1BdTmpNight, nightMix);
    s1BackdropMat.emissive.setHex(isWinterMode ? 0x1b3347 : 0x16332a);
    s1BackdropMat.emissiveIntensity = nightMix * (isWinterMode ? 0.38 : 0.44);

    if (s1BackdropBorderMat) {
        s1BackdropBorderMat.color.setHex(isWinterMode ? (nightMix > 0.5 ? 0x94a3b8 : 0x475569) : 0x94a3b8);
        s1BackdropBorderMat.opacity = isWinterMode ? 0.80 : (0.65 - nightMix * 0.2);
    }
}

function buildFarEastBackdrop() {
    s1BackdropGroup = new THREE.Group();
    sakhalin1Group.add(s1BackdropGroup);

    const BACKDROP_POLYGON_LONLAT = [
        // Побережье Охотского моря (Магаданская область от восточного края Охотского сектора под облака)
        [144.35, 59.58], [146.10, 59.32], [148.20, 59.62], [150.80, 59.56],
        [152.65, 59.15], [154.60, 59.95], [158.80, 61.50], [164.00, 64.50],
        // Северная кромка глубоко за линией облаков
        [156.00, 68.50], [146.00, 69.00], [136.00, 69.20], [126.00, 69.00],
        [116.00, 68.00], [105.00, 66.00], [101.00, 63.00],
        // Западная кромка глубоко за линией облаков
        [101.00, 58.20], [101.00, 54.00], [102.00, 50.00], [112.00, 49.70],
        // Строгий край по южной границе РФ (Забайкалье -> верхний Амур)
        [116.40, 49.85], [118.20, 49.55], [119.80, 50.10], [120.75, 51.65],
        [121.55, 53.30], [123.30, 53.55], [124.20, 53.35],
        // Внутренний нахлёст глубже под высокую континентальную часть ДВ (убирает синюю полосу шельфа на стыке!)
        [125.10, 54.40], [126.10, 55.45], [127.80, 56.10], [130.20, 56.75],
        [133.00, 57.50], [136.20, 58.50], [139.30, 59.35], [142.20, 59.75], [143.95, 59.72]
    ];

    const shape = new THREE.Shape();
    BACKDROP_POLYGON_LONLAT.forEach(([lon, lat], idx) => {
        const [x, z] = lonLatToXZ(lon, lat);
        if (idx === 0) shape.moveTo(x, -z);
        else shape.lineTo(x, -z);
    });
    shape.closePath();

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.36,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.32,
        bevelSegments: 1,
        curveSegments: 1
    });
    extrudeGeo.rotateX(-Math.PI / 2);

    s1BackdropMat = new THREE.MeshStandardMaterial({
        color: 0x3a4656,
        roughness: 0.88,
        metalness: 0.04,
        flatShading: true
    });

    const backdropMesh = new THREE.Mesh(extrudeGeo, s1BackdropMat);
    backdropMesh.position.y = 0.02;
    backdropMesh.receiveShadow = true;
    s1BackdropGroup.add(backdropMesh);

    const ridgeSpecs = [
        { lon: 148.5, lat: 61.2, rx: 14, ry: 1.5, rz: 9, rot: 0.25 },
        { lon: 152.2, lat: 61.4, rx: 11, ry: 1.35, rz: 8, rot: -0.3 },
        { lon: 143.5, lat: 61.8, rx: 15, ry: 1.4, rz: 10, rot: 0.15 },
        { lon: 136.5, lat: 61.5, rx: 16, ry: 1.25, rz: 11, rot: -0.2 },
        { lon: 129.8, lat: 59.6, rx: 15, ry: 1.15, rz: 9, rot: 0.4 },
        { lon: 124.2, lat: 58.4, rx: 14, ry: 1.1, rz: 9, rot: -0.15 },
        { lon: 119.2, lat: 55.2, rx: 13, ry: 1.3, rz: 10, rot: 0.35 },
        { lon: 118.6, lat: 52.2, rx: 11, ry: 1.15, rz: 8, rot: -0.25 }
    ];

    const ridgeGeo = new THREE.ConeGeometry(1, 1, 5);
    ridgeSpecs.forEach(r => {
        const [rx, rz] = lonLatToXZ(r.lon, r.lat);
        const ridge = new THREE.Mesh(ridgeGeo, s1BackdropMat);
        ridge.scale.set(r.rx, r.ry, r.rz);
        ridge.rotation.y = r.rot;
        ridge.position.set(rx, 0.38 + r.ry * 0.42, rz);
        ridge.receiveShadow = true;
        s1BackdropGroup.add(ridge);
    });

    const innerSeamLonLat = [
        [124.20, 53.35], [124.40, 54.60], [125.20, 55.80], [127.00, 56.65],
        [129.80, 57.25], [132.80, 58.05], [136.00, 59.10], [139.20, 59.95],
        [142.20, 60.35], [144.45, 60.15], [144.35, 59.58]
    ];
    const innerPts = innerSeamLonLat.map(([lon, lat]) => {
        const [x, z] = lonLatToXZ(lon, lat);
        const y = Math.max(0.46, getAnyLandElevation(x, z) + 0.16);
        return new THREE.Vector3(x, y, z);
    });
    const innerCurve = new THREE.CatmullRomCurve3(innerPts, false, 'centripetal');
    s1BackdropBorderMat = new THREE.LineBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.65
    });
    const innerLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(innerCurve.getPoints(80)),
        s1BackdropBorderMat
    );
    s1BackdropGroup.add(innerLine);

    const southBorderLonLat = [
        [116.40, 49.85], [118.20, 49.55], [119.80, 50.10],
        [120.75, 51.65], [121.55, 53.30], [123.30, 53.55], [124.20, 53.35]
    ];
    const southPts = southBorderLonLat.map(([lon, lat]) => {
        const [x, z] = lonLatToXZ(lon, lat);
        return new THREE.Vector3(x, 0.45, z);
    });
    const southLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(southPts),
        new THREE.LineBasicMaterial({
            color: 0xcbd5e1,
            transparent: true,
            opacity: 0.72
        })
    );
    s1BackdropGroup.add(southLine);

    updateFarEastBackdropColor();
}

const _s1CloudDaySummer = new THREE.Color(0xdbe8f6);
const _s1CloudDayWinter = new THREE.Color(0x4c6a86);
const _s1CloudNight = new THREE.Color(0x1b2d47);
const _s1CloudFloorDaySummer = new THREE.Color(0xc5d8ec);
const _s1CloudFloorDayWinter = new THREE.Color(0x3a546e);
const _s1CloudFloorNight = new THREE.Color(0x132036);
const _s1CloudTmp = new THREE.Color();

function updateSakhalin1CloudsColor() {
    const wMix = isWinterMode ? 1.0 : 0.0;
    if (s1CloudMat) {
        _s1CloudTmp.copy(_s1CloudDaySummer).lerp(_s1CloudDayWinter, wMix);
        s1CloudMat.color.copy(_s1CloudTmp).lerp(_s1CloudNight, nightMix);
        s1CloudMat.emissive.setHex(0x0d1b30);
        s1CloudMat.emissiveIntensity = nightMix * 0.32;
    }
    if (s1CloudFloorMat) {
        _s1CloudTmp.copy(_s1CloudFloorDaySummer).lerp(_s1CloudFloorDayWinter, wMix);
        s1CloudFloorMat.color.copy(_s1CloudTmp).lerp(_s1CloudFloorNight, nightMix);
        s1CloudFloorMat.emissive.setHex(0x091324);
        s1CloudFloorMat.emissiveIntensity = nightMix * 0.25;
    }
}

function buildFarEastTaiga() {
    const maxTrees = 1850;
    const treeGeo = new THREE.ConeGeometry(0.46, 1.28, 5);
    treeGeo.translate(0, 0.64, 0);
    const treeMat = new THREE.MeshStandardMaterial({
        color: isWinterMode ? _winterTaigaTint.clone() : _summerTaigaTint.clone(),
        roughness: 0.86,
        metalness: 0.02,
        flatShading: true
    });

    s1TaigaMesh = new THREE.InstancedMesh(treeGeo, treeMat, maxTrees);
    s1TaigaMesh.castShadow = false;
    s1TaigaMesh.receiveShadow = true;

    const avoidZones = [];
    SAKHALIN1_FACILITIES_DATA.forEach(f => {
        if (f.category === 'onshore' && f.geoLonLat) {
            const [fx, fz] = lonLatToXZ(f.geoLonLat[0], f.geoLonLat[1]);
            avoidZones.push([fx, fz, 5.2]);
        }
    });
    FAR_EAST_CITIES_DATA.forEach(c => {
        if (c.isRegion || c.isTransit || c.isNeighbor) return;
        const [cx, cz] = lonLatToXZ(c.geoLonLat[0], c.geoLonLat[1]);
        const rad = c.name === 'оз. Ханка' ? 5.2 : 3.6;
        avoidZones.push([cx, cz, rad]);
    });

    let seed = 61907;
    function nextRand() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    }

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    let placed = 0;
    let attempts = 0;

    while (placed < maxTrees && attempts < 22000) {
        attempts++;
        const tx = farEastAABB.minX + nextRand() * (farEastAABB.maxX - farEastAABB.minX);
        const tz = farEastAABB.minZ + nextRand() * (farEastAABB.maxZ - farEastAABB.minZ);

        if (!isPointInPolygon(tx, tz, farEastOutline)) continue;
        if (distToFarEastShore(tx, tz) < 1.55) continue;

        const elev = getFarEastElevation(tx, tz);
        if (elev < 0.36 || elev > 2.55) continue;

        let blocked = false;
        for (let a = 0; a < avoidZones.length; a++) {
            const dx = tx - avoidZones[a][0];
            const dz = tz - avoidZones[a][1];
            if (dx * dx + dz * dz < avoidZones[a][2] * avoidZones[a][2]) {
                blocked = true;
                break;
            }
        }
        if (blocked) continue;

        const sc = 0.78 + nextRand() * 0.72;
        dummy.position.set(tx, elev - 0.06, tz);
        dummy.rotation.y = nextRand() * Math.PI * 2;
        dummy.scale.set(sc, sc * (0.88 + nextRand() * 0.36), sc);
        dummy.updateMatrix();
        s1TaigaMesh.setMatrixAt(placed, dummy.matrix);

        const tone = 0.76 + nextRand() * 0.34;
        col.setRGB(0.09 * tone, 0.29 * tone, 0.16 * tone);
        s1TaigaMesh.setColorAt(placed, col);
        placed++;
    }

    s1TaigaMesh.count = placed;
    s1TaigaMesh.instanceMatrix.needsUpdate = true;
    if (s1TaigaMesh.instanceColor) s1TaigaMesh.instanceColor.needsUpdate = true;
    sakhalin1Group.add(s1TaigaMesh);
    s1TaigaPoints = createTaigaPointsFromInstanced(s1TaigaMesh, 1.55);
    sakhalin1Group.add(s1TaigaPoints);
    updateTaigaPointsTint();
}

function buildSakhalin1SeaIce() {
    const floeCount = 720;
    const iceGeo = new THREE.CylinderGeometry(1.0, 1.12, 0.17, 6);
    const iceMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.42,
        metalness: 0.04,
        flatShading: true,
        transparent: true,
        opacity: isWinterMode ? 1.0 : 0.0,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2
    });

    s1SeaIceMesh = new THREE.InstancedMesh(iceGeo, iceMat, floeCount);
    s1SeaIceMesh.visible = isWinterMode;
    s1SeaIceFloes = [];

    let seed = 42913;
    function nextRand() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    const icePalette = [
        new THREE.Color(0xf2f8ff),
        new THREE.Color(0xe6f2fd),
        new THREE.Color(0xdbeaf8),
        new THREE.Color(0xedf6fe)
    ];

    // Реальная спутниковая картина зимнего льда (февраль–март, Росгидромет / MODIS):
    // 1) Север и запад Охотского моря (Шантарское море, севернее п-ова Шмидта) — плотные крупные поля без наслоения
    // 2) Центральная и западная часть Охотского моря (Восточно-Сахалинский ледяной щит к Курилам)
    // 3) Северная половина Татарского пролива (южнее припая до линии Советская Гавань — Шахтёрск ~49.05°N)
    // 4) Охотский дрейфовый лёд (рюхё) у северо-востока Хоккайдо и южных Курил (восточнее пролива Лаперуза)
    // 5) Закрытые бухты и заливы Приморья (Амурский, Уссурийский, Находка — открытое Японское море чистое!)
    const zones = [
        { lonMin: 135.20, lonMax: 150.20, latMin: 53.00, latMax: 58.60, quota: 255, mode: 'northOkhotsk', sizeScale: 1.92 },
        { lonMin: 143.65, lonMax: 150.40, latMin: 45.60, latMax: 53.30, quota: 175, mode: 'eastOkhotsk',  sizeScale: 1.58 },
        { lonMin: 140.25, lonMax: 142.35, latMin: 49.05, latMax: 50.40, quota: 70,  mode: 'tatarNorth',   sizeScale: 1.05 },
        { lonMin: 143.75, lonMax: 147.10, latMin: 44.30, latMax: 45.75, quota: 52,  mode: 'hokkaidoRyu',  sizeScale: 1.18 },
        { lonMin: 131.35, lonMax: 133.15, latMin: 42.65, latMax: 43.42, quota: 32,  mode: 'vladBays',     sizeScale: 0.62 }
    ];

    let placed = 0;
    zones.forEach(z => {
        let zonePlaced = 0;
        let attempts = 0;
        while (zonePlaced < z.quota && placed < floeCount && attempts < 7500) {
            attempts++;
            let lat;
            let lon;
            let localSize = 1.0;

            if (z.mode === 'northOkhotsk') {
                lat = z.latMin + Math.pow(nextRand(), 0.82) * (z.latMax - z.latMin);
                // Волнистая природная восточная кромка + редкий шлейф оторвавшихся мелких льдин в открытом море
                const wave = Math.sin(lat * 1.15) * 1.05 + Math.cos(lat * 2.4) * 0.45;
                const isOuterTail = nextRand() < 0.16;
                const span = (isOuterTail ? 13.8 : 11.2) + wave;
                lon = z.lonMin + Math.pow(nextRand(), isOuterTail ? 1.05 : 1.38) * span;
                const northCoastCap = lon <= 143.2 ? 58.55 : (58.55 - (lon - 143.2) * 0.32);
                if (lat > northCoastCap) continue;
                if (lat < 54.92 && lon > 139.35 && lon < 142.55) continue;
                const westDense = Math.max(0, 1.0 - (lon - z.lonMin) / Math.max(1, span));
                localSize = (isOuterTail ? 0.48 : 0.68) + 0.50 * westDense;
            } else if (z.mode === 'eastOkhotsk') {
                lat = z.latMin + Math.pow(nextRand(), 0.72) * (z.latMax - z.latMin);
                const latNorm = (lat - z.latMin) / (z.latMax - z.latMin);
                // Живая волнистая кромка ледяного «языка» (языки и бухты льда + редкие дрейфующие льдины дальше в море)
                const wave = Math.sin(lat * 1.25) * 0.95 + Math.cos(lat * 2.65) * 0.45;
                const isOuterTail = nextRand() < 0.18;
                const baseWidth = (2.2 + 3.1 * latNorm) + wave + (isOuterTail ? 1.9 : 0.0);
                lon = z.lonMin + Math.pow(nextRand(), isOuterTail ? 1.15 : 1.75) * Math.max(1.2, baseWidth);
                const kurilRidgeLat = 43.95 + (lon - 145.4) * 0.44;
                if (lon > 145.3 && lat < kurilRidgeLat + 0.55) continue;
                const shoreProx = Math.max(0, 1.0 - (lon - z.lonMin) / Math.max(1.2, baseWidth));
                localSize = (isOuterTail ? 0.38 : 0.52) + 0.60 * (0.60 * shoreProx + 0.40 * latNorm);
            } else if (z.mode === 'tatarNorth') {
                lat = z.latMin + Math.pow(nextRand(), 0.55) * (z.latMax - z.latMin);
                lon = z.lonMin + Math.pow(nextRand(), 0.72) * (z.lonMax - z.lonMin);
                const latNorm = (lat - z.latMin) / Math.max(0.1, z.latMax - z.latMin);
                localSize = 0.48 + 0.65 * latNorm;
            } else if (z.mode === 'hokkaidoRyu') {
                lat = z.latMin + Math.pow(nextRand(), 0.78) * (z.latMax - z.latMin);
                lon = z.lonMin + Math.pow(nextRand(), 1.25) * (z.lonMax - z.lonMin);
                // Не залезаем на сушу Хоккайдо (северо-восточный берег идёт от 141.8,45.4 к 145.6,43.8) и на Курилы
                const hokkaidoCoastLat = 45.45 - (lon - 141.8) * 0.42;
                if (lon < 145.6 && lat < hokkaidoCoastLat + 0.35) continue;
                const kurilLineLat = 43.95 + (lon - 145.4) * 0.44;
                if (lon >= 145.2 && lat < kurilLineLat + 0.48) continue;
                localSize = 0.65 + 0.45 * nextRand();
            } else {
                // Закрытые заливы и бухты Приморья (только близко к берегу — открытое Японское море чистое!)
                lat = z.latMin + nextRand() * (z.latMax - z.latMin);
                lon = z.lonMin + nextRand() * (z.lonMax - z.lonMin);
            }

            const [fx, fz] = lonLatToXZ(lon, lat);
            const landH = getAnyLandElevation(fx, fz);
            if (landH > -0.35) continue;
            // Для бухт Приморья держим лёд строго на мелководье/в заливах у берега (без вылезания в открытое Японское море)
            if (z.mode === 'vladBays' && landH < -1.15) continue;

            const sx = (0.82 + nextRand() * 1.15) * z.sizeScale * localSize;
            const sz = (0.82 + nextRand() * 1.15) * z.sizeScale * localSize;
            const approxRad = Math.max(sx, sz) * 1.08;

            // Анти-коллизия: запрещаем льдинам наползать друг на друга (устраняет наслоение и рябь!)
            let overlaps = false;
            for (let k = 0; k < s1SeaIceFloes.length; k++) {
                const o = s1SeaIceFloes[k];
                const minD = (approxRad + o.rad) * 0.94;
                const dx = fx - o.x;
                const dz = fz - o.z;
                if (dx * dx + dz * dz < minD * minD) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            const yLayer = 0.09 + (placed % 9) * 0.012;

            const floe = {
                x: fx,
                z: fz,
                yBase: yLayer,
                rad: approxRad,
                rotY: nextRand() * Math.PI * 2,
                rotSpeed: (nextRand() - 0.5) * 0.10,
                scaleX: sx,
                scaleZ: sz,
                phase: nextRand() * Math.PI * 2
            };
            s1SeaIceFloes.push(floe);

            _iceDummy.position.set(floe.x, floe.yBase, floe.z);
            _iceDummy.rotation.set(0, floe.rotY, 0);
            _iceDummy.scale.set(floe.scaleX, 1, floe.scaleZ);
            _iceDummy.updateMatrix();
            s1SeaIceMesh.setMatrixAt(placed, _iceDummy.matrix);
            s1SeaIceMesh.setColorAt(placed, icePalette[placed % icePalette.length]);
            placed++;
            zonePlaced++;
        }
    });

    s1SeaIceMesh.count = placed;
    s1SeaIceMesh.instanceMatrix.needsUpdate = true;
    if (s1SeaIceMesh.instanceColor) s1SeaIceMesh.instanceColor.needsUpdate = true;
    sakhalin1Group.add(s1SeaIceMesh);
}

function updateSakhalin1SeaIce(dt, elapsed) {
    const wMix = (typeof winterMix !== 'undefined') ? winterMix : (isWinterMode ? 1.0 : 0.0);
    if (wMix <= 0.01 || !s1SeaIceMesh || !s1SeaIceMesh.visible) return;

    const iceMix = (typeof tatarIce !== 'undefined') ? tatarIce.fastIceMix : 0.0;
    const ships = [];
    if (typeof tatarIce !== 'undefined' && tatarIce.tankerObj && tatarIce.tankerObj.visible) {
        ships.push({ x: tatarIce.tankerObj.position.x, z: tatarIce.tankerObj.position.z, r: 5.2 });
    }
    if (typeof farEastAlive !== 'undefined' && farEastAlive.ferryGroup && farEastAlive.ferryGroup.visible) {
        ships.push({ x: farEastAlive.ferryGroup.position.x, z: farEastAlive.ferryGroup.position.z, r: 4.5 });
    }

    const fastZone = (typeof tatarIce !== 'undefined' && tatarIce.boundsXZ) ? tatarIce.boundsXZ : null;

    for (let i = 0; i < s1SeaIceFloes.length; i++) {
        const floe = s1SeaIceFloes[i];
        if (floe.pushX === undefined) { floe.pushX = 0; floe.pushZ = 0; }
        floe.rotY += dt * floe.rotSpeed;

        const driftX = floe.x + Math.sin(elapsed * 0.35 + floe.phase) * 0.45;
        const driftZ = floe.z + Math.cos(elapsed * 0.30 + floe.phase) * 0.45;
        let curX = driftX + floe.pushX;
        let curZ = driftZ + floe.pushZ;

        // Раздвигаем дрейфующие льдины в стороны от корпуса танкера S1 и парома
        let pushed = false;
        for (let s = 0; s < ships.length; s++) {
            const sh = ships[s];
            const dx = curX - sh.x;
            const dz = curZ - sh.z;
            const distSq = dx * dx + dz * dz;
            if (distSq < sh.r * sh.r) {
                const dist = Math.sqrt(distSq) || 0.05;
                const nx = dx / dist;
                const nz = dz / dist;
                const targetPush = (sh.r - dist) * 1.18;
                floe.pushX += nx * targetPush * Math.min(1, dt * 8.5);
                floe.pushZ += nz * targetPush * Math.min(1, dt * 8.5);
                pushed = true;
            }
        }
        if (!pushed) {
            const relax = Math.min(1, dt * 0.55);
            floe.pushX += (0 - floe.pushX) * relax;
            floe.pushZ += (0 - floe.pushZ) * relax;
        }

        // Внутри зоны ночного сплошного припая дрейфующие льдины плавно «сливаются» с припаем (без мерцания)
        let zoneScale = 1.0;
        if (iceMix > 0.02 && fastZone) {
            const inTatar = floe.x >= fastZone.minX && floe.x <= fastZone.maxX &&
                            floe.z >= fastZone.minZ && floe.z <= fastZone.maxZ;
            if (inTatar) {
                zoneScale = Math.max(0.001, 1.0 - iceMix * 0.98);
            }
        }

        _iceDummy.position.set(
            driftX + floe.pushX,
            (floe.yBase || 0.09) + Math.sin(elapsed * 1.3 + floe.phase) * 0.012,
            driftZ + floe.pushZ
        );
        _iceDummy.rotation.set(0, floe.rotY, 0);
        _iceDummy.scale.set(floe.scaleX * zoneScale, zoneScale, floe.scaleZ * zoneScale);
        _iceDummy.updateMatrix();
        s1SeaIceMesh.setMatrixAt(i, _iceDummy.matrix);
    }
    s1SeaIceMesh.instanceMatrix.needsUpdate = true;
}

const worldClouds = {
    built: false,
    group: null,
    floorMesh: null,
    floorGeo: null,
    floorMeta: null,
    capItems: [],
    // Текущие анимируемые параметры апертуры облаков
    curCx: 2,
    curCz: 8,
    curRx: 0,
    curRz: 0,
    curClosed: 1.0,
    // Параметры плавного перехода
    animating: false,
    animProgress: 1,
    animDuration: 1.4,
    startCx: 2, startCz: 8, startRx: 0, startRz: 0, startClosed: 1.0,
    endCx: 2,   endCz: 8,   endRx: 0,   endRz: 0,   endClosed: 1.0,
    onComplete: null,
    floorDirty: true
};

const WORLD_CLOUD_PRESETS = {
    sakhalin2: { cx: -12,  cz: -10, rx: 228, rz: 274, closed: 0.0 },
    sakhalin1: { cx: -120, cz: 5,   rx: 334, rz: 362, closed: 0.0 }
};

function getWorldCloudPreset(presetName) {
    const mobile = isMobileViewport();
    const w = viewportWidth || window.innerWidth || 1280;
    const h = viewportHeight || window.innerHeight || 720;
    const aspect = Math.max(0.45, Math.min(2.4, w / Math.max(1, h)));

    if (presetName === 'sakhalin1' || presetName === 'sakhalin3' || presetName === 'shv') {
        if (mobile) {
            return { cx: -116, cz: 8, rx: 338, rz: 372, closed: 0.0 };
        }
        const wideExtra = Math.max(0, (aspect - 1.55) * 42);
        return { cx: -124, cz: 5, rx: Math.round(372 + wideExtra), rz: 372, closed: 0.0 };
    }

    // Пресет для «Сахалин-2»: на ПК делаем горизонтальный радиус заметно шире,
    // чтобы облака не попадали в края широкоформатного монитора до сдвига камеры
    if (mobile) {
        return { cx: -6, cz: 4, rx: 232, rz: 282, closed: 0.0 };
    }
    const wideExtraS2 = Math.max(0, (aspect - 1.55) * 58);
    return { cx: -20, cz: 4, rx: Math.round(325 + wideExtraS2), rz: 286, closed: 0.0 };
}

function buildWorldLowPolyClouds() {
    if (worldClouds.built) return;
    worldClouds.built = true;

    worldClouds.group = new THREE.Group();
    // Добавляем прямо в scene, чтобы 3D-облака жили и в «Сахалин-2», и в «Сахалин-1»!
    scene.add(worldClouds.group);

    const cloudGeo = new THREE.DodecahedronGeometry(1.0, 0);
    s1CloudMat = new THREE.MeshStandardMaterial({
        color: 0xdbe8f6,
        roughness: 0.90,
        metalness: 0.02,
        flatShading: true,
        transparent: false
    });

    _s1CloudDummy = new THREE.Object3D();
    s1CloudItems = [];
    worldClouds.capItems = [];

    let seed = 73319;
    function rand() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    // 1. Динамическая 3D-пелена облаков (морфится от сплошного полотна до кольца S2 и широкого кольца S1)
    const segTheta = 64;
    const segPhi = 6;
    const floorGeo = new THREE.RingGeometry(1, 2, segTheta, segPhi);
    floorGeo.rotateX(-Math.PI / 2);

    const fPos = floorGeo.attributes.position;
    const vCount = fPos.count;
    const floorMeta = {
        cosA: new Float32Array(vCount),
        sinA: new Float32Array(vCount),
        ringT: new Float32Array(vCount),
        waveA: new Float32Array(vCount),
        waveB: new Float32Array(vCount)
    };

    for (let i = 0; i < vCount; i++) {
        const vx = fPos.getX(i);
        const vz = fPos.getZ(i);
        const rRaw = Math.hypot(vx, vz) || 1;
        const ca = vx / rRaw;
        const sa = vz / rRaw;
        const t = Math.max(0, Math.min(1, rRaw - 1.0));
        floorMeta.cosA[i] = ca;
        floorMeta.sinA[i] = sa;
        floorMeta.ringT[i] = t;
        floorMeta.waveA[i] = Math.sin(ca * 5.2 + sa * 4.7 + t * 9.0) * 2.1;
        floorMeta.waveB[i] = Math.cos(ca * 3.8 - sa * 6.1 + t * 7.0) * 1.7;
    }
    worldClouds.floorGeo = floorGeo;
    worldClouds.floorMeta = floorMeta;

    s1CloudFloorMat = new THREE.MeshStandardMaterial({
        color: 0xc5d8ec,
        roughness: 0.94,
        metalness: 0.01,
        flatShading: true
    });
    worldClouds.floorMesh = new THREE.Mesh(floorGeo, s1CloudFloorMat);
    worldClouds.group.add(worldClouds.floorMesh);

    // 2. Пять концентрических 3D-колец гранёных облаков, параметризованных относительно текущего радиуса (curRx, curRz)
    const ringDefs = [
        { count: 62, addRx: 0,   addRz: 0,   yMin: 2.2,  yMax: 8.2,  scaleMin: 23, scaleMax: 35, puffs: 2, s2Scale: 0.72 },
        { count: 58, addRx: 54,  addRz: 58,  yMin: 5.0,  yMax: 13.0, scaleMin: 31, scaleMax: 47, puffs: 2, s2Scale: 0.84 },
        { count: 50, addRx: 138, addRz: 146, yMin: 7.5,  yMax: 17.5, scaleMin: 46, scaleMax: 70, puffs: 2, s2Scale: 0.94 },
        { count: 44, addRx: 270, addRz: 286, yMin: 10.0, yMax: 21.5, scaleMin: 68, scaleMax: 102, puffs: 1, s2Scale: 1.0 },
        { count: 38, addRx: 450, addRz: 475, yMin: 12.5, yMax: 26.5, scaleMin: 96, scaleMax: 142, puffs: 1, s2Scale: 1.0 }
    ];

    ringDefs.forEach(ring => {
        for (let i = 0; i < ring.count; i++) {
            const angle = (i / ring.count) * Math.PI * 2 + (rand() - 0.5) * 0.12;
            const jitterR = 0.95 + rand() * 0.12;
            const baseY = ring.yMin + rand() * (ring.yMax - ring.yMin);
            const mainScale = ring.scaleMin + rand() * (ring.scaleMax - ring.scaleMin);
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);

            const puffs = ring.puffs === 1 ? 1 : (2 + Math.floor(rand() * 2));
            for (let p = 0; p < puffs; p++) {
                const pAng = rand() * Math.PI * 2;
                const pDist = p === 0 ? 0 : mainScale * (0.42 + rand() * 0.38);
                const pScale = p === 0 ? mainScale : mainScale * (0.64 + rand() * 0.30);

                s1CloudItems.push({
                    isCap: false,
                    cosA,
                    sinA,
                    jitterR,
                    addRx: ring.addRx,
                    addRz: ring.addRz,
                    offX: Math.cos(pAng) * pDist,
                    offZ: Math.sin(pAng) * pDist,
                    baseY: baseY + (p === 0 ? 0 : (rand() - 0.45) * 3.0),
                    sx: pScale * (1.08 + rand() * 0.42),
                    sy: pScale * (0.24 + rand() * 0.12),
                    sz: pScale * (0.98 + rand() * 0.40),
                    s2Scale: ring.s2Scale,
                    rotY: rand() * Math.PI * 2,
                    phase: rand() * Math.PI * 2,
                    driftSpeed: 0.16 + rand() * 0.20
                });
            }
        }
    });

    // 3. Центральная «крышка» из 32 объёмных 3D-облаков:
    //    при закрытии (curClosed -> 1) они смыкаются и полностью накрывают остров без просветов,
    //    а при раскрытии уходят в стороны и тают в 0, оставляя остров идеально чистым
    for (let i = 0; i < 32; i++) {
        const angle = (i / 32) * Math.PI * 2 + (rand() - 0.5) * 0.35;
        const rad = i < 5 ? rand() * 22 : (22 + rand() * 88);
        const sc = 26 + rand() * 24;
        s1CloudItems.push({
            isCap: true,
            cosA: Math.cos(angle),
            sinA: Math.sin(angle),
            capRad: rad,
            baseY: 13.5 + rand() * 9.5,
            sx: sc * (1.1 + rand() * 0.45),
            sy: sc * (0.26 + rand() * 0.14),
            sz: sc * (1.0 + rand() * 0.42),
            rotY: rand() * Math.PI * 2,
            phase: rand() * Math.PI * 2,
            driftSpeed: 0.20 + rand() * 0.22
        });
    }

    s1CloudMesh = new THREE.InstancedMesh(cloudGeo, s1CloudMat, s1CloudItems.length);
    s1CloudMesh.castShadow = false;
    s1CloudMesh.receiveShadow = false;
    s1CloudMesh.frustumCulled = false;
    worldClouds.group.add(s1CloudMesh);

    updateSakhalin1CloudsColor();
    snapWorldCloudsClosed(2, 8);
}

// Оставляем имя buildSakhalin1Clouds для совместимости с ensureSakhalin1Built()
function buildSakhalin1Clouds() {
    buildWorldLowPolyClouds();
}

function updateWorldCloudFloorGeometry() {
    if (!worldClouds.floorGeo || !worldClouds.floorMeta) return;
    const pos = worldClouds.floorGeo.attributes.position;
    const meta = worldClouds.floorMeta;
    const rx0 = worldClouds.curRx;
    const rz0 = worldClouds.curRz;
    const closed = worldClouds.curClosed;

    // Внутренний край пелены при раскрытии прижат к воде (y = 0.35),
    // а при закрытии поднимается на y = 12.2, полностью укрывая горы и платформы
    const innerY = 0.35 + closed * 11.85;
    const outerBaseY = 5.0 + closed * 8.2;

    for (let i = 0; i < pos.count; i++) {
        const t = meta.ringT[i];
        const tPow = Math.pow(t, 1.55);
        const rX = rx0 + (1680 - rx0) * tPow;
        const rZ = rz0 + (1820 - rz0) * tPow;
        const wave = meta.waveA[i] + meta.waveB[i];

        let vy;
        if (t < 0.02) {
            vy = innerY + wave * closed * 0.45;
        } else if (t < 0.22) {
            const k = (t - 0.02) / 0.20;
            const sm = k * k * (3 - 2 * k);
            vy = innerY + (outerBaseY + wave - innerY) * sm;
        } else {
            vy = outerBaseY + wave;
        }

        pos.setXYZ(i, meta.cosA[i] * rX, vy, meta.sinA[i] * rZ);
    }
    pos.needsUpdate = true;
    worldClouds.floorGeo.computeVertexNormals();
    if (worldClouds.floorMesh) {
        worldClouds.floorMesh.position.set(worldClouds.curCx, 0, worldClouds.curCz);
    }
    worldClouds.floorDirty = false;
}

function snapWorldCloudsClosed(cx, cz) {
    if (!worldClouds.built) buildWorldLowPolyClouds();
    worldClouds.animating = false;
    worldClouds.onComplete = null;
    worldClouds.curCx = cx;
    worldClouds.curCz = cz;
    worldClouds.curRx = 0;
    worldClouds.curRz = 0;
    worldClouds.curClosed = 1.0;
    worldClouds.endCx = cx;
    worldClouds.endCz = cz;
    worldClouds.endRx = 0;
    worldClouds.endRz = 0;
    worldClouds.endClosed = 1.0;
    worldClouds.floorDirty = true;
    updateWorldClouds(0, 0);
}

function setWorldCloudsAperture(presetName, options) {
    if (!worldClouds.built) buildWorldLowPolyClouds();
    const opts = options || {};
    let target;
    if (presetName === 'closed') {
        target = {
            cx: opts.centerX !== undefined ? opts.centerX : worldClouds.curCx,
            cz: opts.centerZ !== undefined ? opts.centerZ : worldClouds.curCz,
            rx: 0,
            rz: 0,
            closed: 1.0
        };
    } else {
        target = getWorldCloudPreset(presetName);
    }

    worldClouds.startCx = worldClouds.curCx;
    worldClouds.startCz = worldClouds.curCz;
    worldClouds.startRx = worldClouds.curRx;
    worldClouds.startRz = worldClouds.curRz;
    worldClouds.startClosed = worldClouds.curClosed;

    worldClouds.endCx = target.cx;
    worldClouds.endCz = target.cz;
    worldClouds.endRx = target.rx;
    worldClouds.endRz = target.rz;
    worldClouds.endClosed = target.closed;

    worldClouds.animProgress = 0;
    worldClouds.animDuration = opts.duration || 1.35;
    worldClouds.onComplete = opts.onDone || null;
    worldClouds.animating = true;
    worldClouds.floorDirty = true;
}

function updateWorldClouds(dt, elapsed) {
    if (!worldClouds.built || !s1CloudMesh || !_s1CloudDummy) return;

    if (worldClouds.animating) {
        worldClouds.animProgress += (dt || 0) / Math.max(0.15, worldClouds.animDuration);
        const t = Math.min(1, worldClouds.animProgress);
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        worldClouds.curCx = worldClouds.startCx + (worldClouds.endCx - worldClouds.startCx) * ease;
        worldClouds.curCz = worldClouds.startCz + (worldClouds.endCz - worldClouds.startCz) * ease;
        worldClouds.curRx = worldClouds.startRx + (worldClouds.endRx - worldClouds.startRx) * ease;
        worldClouds.curRz = worldClouds.startRz + (worldClouds.endRz - worldClouds.startRz) * ease;
        worldClouds.curClosed = worldClouds.startClosed + (worldClouds.endClosed - worldClouds.startClosed) * ease;
        worldClouds.floorDirty = true;

        if (t >= 1) {
            worldClouds.animating = false;
            const cb = worldClouds.onComplete;
            worldClouds.onComplete = null;
            if (cb) cb();
        }
    }

    if (worldClouds.floorDirty) {
        updateWorldCloudFloorGeometry();
    }

    const cx = worldClouds.curCx;
    const cz = worldClouds.curCz;
    const curRx = worldClouds.curRx;
    const curRz = worldClouds.curRz;
    const closed = worldClouds.curClosed;

    // Плавный масштаб облаков: в «Сахалин-2» чуть аккуратнее, в «Сахалин-1» — крупнее
    const openWideMix = Math.max(0, Math.min(1, (curRx - 228) / (334 - 228)));
    const capVisibility = closed * closed * (3 - 2 * closed);
    const liftY = closed * 10.5;

    for (let i = 0; i < s1CloudItems.length; i++) {
        const c = s1CloudItems[i];
        const driftX = Math.sin(elapsed * c.driftSpeed + c.phase) * 2.6;
        const bobY = Math.cos(elapsed * (c.driftSpeed * 1.3) + c.phase) * 0.65;

        if (c.isCap) {
            if (capVisibility <= 0.005) {
                _s1CloudDummy.position.set(cx, -500, cz);
                _s1CloudDummy.scale.set(0.001, 0.001, 0.001);
            } else {
                // При раскрытии центральные облака разлетаются в стороны и исчезают
                const disperse = (1.0 - capVisibility) * 145;
                const px = cx + c.cosA * (c.capRad + disperse) + driftX;
                const pz = cz + c.sinA * (c.capRad + disperse);
                const py = c.baseY + bobY + (1.0 - capVisibility) * 6.0;
                const sc = Math.max(0.01, capVisibility);
                _s1CloudDummy.position.set(px, py, pz);
                _s1CloudDummy.rotation.set(0, c.rotY, 0);
                _s1CloudDummy.scale.set(c.sx * sc, c.sy * sc, c.sz * sc);
            }
        } else {
            const rX = (curRx + c.addRx) * c.jitterR;
            const rZ = (curRz + c.addRz) * c.jitterR;
            const sizeFactor = (c.s2Scale + (1.0 - c.s2Scale) * openWideMix) * (1.0 + closed * 0.28);
            const px = cx + c.cosA * rX + c.offX * sizeFactor + driftX;
            const pz = cz + c.sinA * rZ + c.offZ * sizeFactor;
            const py = c.baseY + liftY + bobY;

            _s1CloudDummy.position.set(px, py, pz);
            _s1CloudDummy.rotation.set(0, c.rotY, 0);
            _s1CloudDummy.scale.set(c.sx * sizeFactor, c.sy * sizeFactor, c.sz * sizeFactor);
        }

        _s1CloudDummy.updateMatrix();
        s1CloudMesh.setMatrixAt(i, _s1CloudDummy.matrix);
    }
    s1CloudMesh.instanceMatrix.needsUpdate = true;
}

function updateSakhalin1CloudsAnimation(elapsed) {
    updateWorldClouds(0.016, elapsed);
}

function clampSakhalin1CameraTarget() {
    if (cameraTransition.active || !controls || worldClouds.curClosed > 0.25) return;
    const mobile = isMobileViewport();
    let minX, maxX, minZ, maxZ;
    if (isFarEastProject()) {
        if (mobile) {
            minX = -355; maxX = 120; minZ = -265; maxZ = 275;
        } else {
            minX = -395; maxX = 135; minZ = -275; maxZ = 285;
        }
    } else {
        if (mobile) {
            minX = -155; maxX = 135; minZ = -195; maxZ = 195;
        } else {
            minX = -225; maxX = 185; minZ = -205; maxZ = 205;
        }
    }
    const clampedX = Math.max(minX, Math.min(maxX, controls.target.x));
    const clampedZ = Math.max(minZ, Math.min(maxZ, controls.target.z));
    const dx = clampedX - controls.target.x;
    const dz = clampedZ - controls.target.z;
    if (dx !== 0 || dz !== 0) {
        controls.target.x = clampedX;
        controls.target.z = clampedZ;
        camera.position.x += dx;
        camera.position.z += dz;
    }
}

const _s1NbDaySummer = new THREE.Color(0x2b3e38);
const _s1NbDayWinter = new THREE.Color(0xc5d6e6);   // Реальный зимний снег в Маньчжурии (Китай), КНДР и на Хоккайдо (Япония)
const _s1NbNightSummer = new THREE.Color(0x162923);
const _s1NbNightWinter = new THREE.Color(0x4e667d); // Лунно-снежный оттенок ночью
const _s1KrDaySummer = new THREE.Color(0x354a43);
const _s1KrDayWinter = new THREE.Color(0xd2e2f0);   // Заснеженные Курильские острова днём
const _s1KrNightSummer = new THREE.Color(0x1c332c);
const _s1KrNightWinter = new THREE.Color(0x5b758e); // Заснеженные Курилы ночью
const _s1NbTmpDay = new THREE.Color();
const _s1NbTmpNight = new THREE.Color();

function updateNeighborLandsColor() {
    const rawW = (typeof winterMix !== 'undefined') ? winterMix : (isWinterMode ? 1.0 : 0.0);
    const wMix = rawW * rawW * (3.0 - 2.0 * rawW);
    if (s1NeighborsMat) {
        _s1NbTmpDay.copy(_s1NbDaySummer).lerp(_s1NbDayWinter, wMix);
        _s1NbTmpNight.copy(_s1NbNightSummer).lerp(_s1NbNightWinter, wMix);
        s1NeighborsMat.color.copy(_s1NbTmpDay).lerp(_s1NbTmpNight, nightMix);
        s1NeighborsMat.emissive.setHex(isWinterMode ? 0x1d344a : 0x112922);
        s1NeighborsMat.emissiveIntensity = nightMix * (isWinterMode ? 0.30 : 0.38);
    }
    if (s1KurilsMat) {
        _s1NbTmpDay.copy(_s1KrDaySummer).lerp(_s1KrDayWinter, wMix);
        _s1NbTmpNight.copy(_s1KrNightSummer).lerp(_s1KrNightWinter, wMix);
        s1KurilsMat.color.copy(_s1NbTmpDay).lerp(_s1NbTmpNight, nightMix);
        s1KurilsMat.emissive.setHex(isWinterMode ? 0x243e57 : 0x16332a);
        s1KurilsMat.emissiveIntensity = nightMix * (isWinterMode ? 0.34 : 0.44);
    }
    if (s1ChinaBorderMat) {
        if (isWinterMode) {
            s1ChinaBorderMat.color.setHex(nightMix > 0.5 ? 0x7dd3fc : 0x334155);
            s1ChinaBorderMat.emissive.setHex(nightMix > 0.5 ? 0x0284c7 : 0x1e293b);
            s1ChinaBorderMat.emissiveIntensity = nightMix > 0.5 ? 0.35 : 0.15;
            s1ChinaBorderMat.opacity = 0.92;
        } else {
            s1ChinaBorderMat.color.setHex(0xe2e8f0);
            s1ChinaBorderMat.emissive.setHex(0x64748b);
            s1ChinaBorderMat.emissiveIntensity = 0.28;
            s1ChinaBorderMat.opacity = 0.92 - nightMix * 0.20;
        }
    }
}

function buildNeighborLandsAndKurils() {
    s1NeighborsGroup = new THREE.Group();
    sakhalin1Group.add(s1NeighborsGroup);

    s1NeighborsMat = new THREE.MeshStandardMaterial({
        color: 0x2f3a48,
        roughness: 0.89,
        metalness: 0.04,
        flatShading: true
    });

    s1KurilsMat = new THREE.MeshStandardMaterial({
        color: 0x3a4656,
        roughness: 0.86,
        metalness: 0.04,
        flatShading: true
    });

    // Вспомогательная функция создания лоу-поли полигона по координатам [lon, lat]
    function addLowPolyLand(lonLatList, mat, depth = 0.30, yPos = 0.01, bevelSize = 0.28) {
        const shape = new THREE.Shape();
        lonLatList.forEach(([lon, lat], idx) => {
            const [x, z] = lonLatToXZ(lon, lat);
            if (idx === 0) shape.moveTo(x, -z);
            else shape.lineTo(x, -z);
        });
        shape.closePath();

        const geo = new THREE.ExtrudeGeometry(shape, {
            depth: depth,
            bevelEnabled: true,
            bevelThickness: 0.05,
            bevelSize: bevelSize,
            bevelSegments: 1,
            curveSegments: 1
        });
        geo.rotateX(-Math.PI / 2);

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = yPos;
        mesh.receiveShadow = true;
        s1NeighborsGroup.add(mesh);
        return mesh;
    }

    // Вспомогательная функция для гранёных лоу-поли гор и вулканов
    const ridgeConeGeo = new THREE.ConeGeometry(1, 1, 5);
    function addLowPolyRidge(lon, lat, rx, ry, rz, rotY, mat, baseY = 0.32) {
        const [x, z] = lonLatToXZ(lon, lat);
        const m = new THREE.Mesh(ridgeConeGeo, mat);
        m.scale.set(rx, ry, rz);
        m.rotation.y = rotY;
        m.position.set(x, baseY + ry * 0.42, z);
        m.receiveShadow = true;
        s1NeighborsGroup.add(m);
    }

    // -----------------------------------------------------------------
    // 1. СЕРЫЙ КИТАЙ (Маньчжурия) + Корейский полуостров
    //    Края на западе и юге уведены глубоко под облака (срезов не видно даже ночью),
    //    а стык с Приморьем и Владивостоком точно подогнан под рельеф без щелей и выступов
    // -----------------------------------------------------------------
    const CHINA_KOREA_LONLAT = [
        // Западный край глубоко под облаками
        [101.00, 50.25],
        // Нахлёст под серую плиту Забайкалья
        [116.40, 50.10], [118.20, 49.80], [119.80, 50.35], [120.75, 51.90],
        [121.55, 53.55], [123.30, 53.80],
        // Нахлёст под цветную Амурскую область и ЕАО вдоль Амура
        [124.20, 53.68], [125.10, 53.18], [126.20, 52.38], [126.85, 51.38],
        [127.50, 50.56], [128.75, 49.78], [129.95, 49.18], [130.85, 48.46],
        [131.85, 48.12], [133.10, 48.06], [134.05, 48.36], [134.92, 48.34],
        // Усиленный бесшовный нахлёст под склон Приморского края (Уссури -> Ханка -> Уссурийск -> Хасан)
        [134.86, 47.62], [134.50, 46.78], [134.22, 46.02], [133.86, 45.38],
        [133.32, 45.06], [132.72, 44.78], [132.14, 44.28], [131.64, 43.72],
        [131.18, 43.26], [130.95, 42.94], [130.86, 42.62], [130.72, 42.32],
        // Побережье Японского моря (КНДР -> Республика Корея -> глубоко под южные облака)
        [129.85, 41.35], [129.18, 40.38], [127.62, 39.28], [128.45, 38.45],
        [129.40, 37.10], [129.55, 35.40], [129.00, 34.20], [127.00, 31.80],
        [119.00, 31.50], [108.00, 31.50], [101.00, 33.00]
    ];
    addLowPolyLand(CHINA_KOREA_LONLAT, s1NeighborsMat, 0.22, 0.01, 0.16);

    // Лёгкие лоу-поли хребты Китая и Кореи (Большой/Малый Хинган, Чанбайшань)
    [
        { lon: 121.8, lat: 49.0, rx: 14, ry: 1.35, rz: 12, rot: 0.2 },
        { lon: 120.2, lat: 46.2, rx: 13, ry: 1.25, rz: 11, rot: -0.25 },
        { lon: 128.4, lat: 48.0, rx: 11, ry: 1.05, rz: 8, rot: 0.4 },
        { lon: 128.2, lat: 42.2, rx: 12, ry: 1.45, rz: 9, rot: -0.15 },
        { lon: 127.4, lat: 40.2, rx: 10, ry: 1.25, rz: 8, rot: 0.3 }
    ].forEach(r => addLowPolyRidge(r.lon, r.lat, r.rx, r.ry, r.rz, r.rot, s1NeighborsMat, 0.24));

    // Чёткая объёмная 3D-граница между Китаем/КНДР и Дальним Востоком РФ (аккуратно идёт по руслам Амура/Уссури и кончается строго у берега моря)
    const russiaChinaBorder = [
        [116.40, 49.85], [118.20, 49.55], [119.80, 50.10], [120.75, 51.65],
        [121.55, 53.30], [123.30, 53.55],
        [124.34, 53.40], [125.24, 52.92], [126.34, 52.12], [126.98, 51.12],
        [127.62, 50.32], [128.86, 49.54], [130.05, 48.94], [130.95, 48.22],
        [131.92, 47.88], [133.14, 47.82], [134.08, 48.14], [134.68, 48.26],
        [134.38, 47.56], [133.96, 46.74], [133.72, 46.00], [133.36, 45.38],
        [132.68, 45.14], [132.08, 44.94], [131.62, 44.38], [131.29, 43.75],
        [131.02, 43.32], [130.82, 42.95], [130.82, 42.62]
    ];
    const borderRawVecs = russiaChinaBorder.map(([lon, lat]) => {
        const [x, z] = lonLatToXZ(lon, lat);
        const h = Math.max(0.40, getAnyLandElevation(x, z) + 0.22);
        return new THREE.Vector3(x, h, z);
    });
    const borderBaseCurve = new THREE.CatmullRomCurve3(borderRawVecs, false, 'centripetal');
    const borderSampled = borderBaseCurve.getPoints(260).map(pt => {
        const h = Math.max(0.40, getAnyLandElevation(pt.x, pt.z) + 0.22);
        return new THREE.Vector3(pt.x, h, pt.z);
    });
    const borderSmoothCurve = new THREE.CatmullRomCurve3(borderSampled, false, 'centripetal');
    s1ChinaBorderMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        emissive: 0x64748b,
        emissiveIntensity: 0.28,
        roughness: 0.45,
        metalness: 0.15,
        flatShading: true,
        transparent: true,
        opacity: 0.92,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3
    });
    const borderRibbon = new THREE.Mesh(
        new THREE.TubeGeometry(borderSmoothCurve, 260, 0.20, 5, false),
        s1ChinaBorderMat
    );
    s1NeighborsGroup.add(borderRibbon);

    // -----------------------------------------------------------------
    // 2. СЕРАЯ ЯПОНИЯ СНИЗУ (Хоккайдо и северная часть Хонсю)
    // -----------------------------------------------------------------
    const HOKKAIDO_LONLAT = [
        [141.94, 45.52], [142.95, 44.62], [144.20, 44.04], [145.32, 44.34],
        [145.04, 43.94], [145.78, 43.38], [144.38, 42.98], [143.25, 41.93],
        [142.20, 42.45], [141.35, 42.65], [140.92, 42.32], [141.15, 41.80],
        [140.73, 41.76], [140.12, 41.42], [139.85, 42.10], [140.40, 43.30],
        [141.35, 43.35], [141.65, 44.45]
    ];
    addLowPolyLand(HOKKAIDO_LONLAT, s1NeighborsMat, 0.30, 0.01, 0.24);

    // Горы Хоккайдо (Тайсэцудзан, Хидака)
    addLowPolyRidge(142.85, 43.65, 8.5, 1.35, 7.0, 0.35, s1NeighborsMat, 0.32);
    addLowPolyRidge(142.75, 42.70, 6.2, 1.10, 5.5, -0.2, s1NeighborsMat, 0.32);
    addLowPolyRidge(144.60, 43.65, 5.5, 0.95, 4.5, 0.5, s1NeighborsMat, 0.32);

    const HONSHU_NORTH_LONLAT = [
        [140.35, 41.25], [141.45, 41.42], [141.52, 40.55], [142.05, 39.65],
        [141.55, 38.45], [140.92, 37.90], [140.88, 36.60], [140.85, 35.75],
        [140.30, 34.90], [139.65, 35.15], [138.80, 34.60], [137.40, 34.20],
        [135.80, 33.40], [134.80, 34.20], [136.40, 35.80], [136.90, 37.30],
        [138.20, 37.20], [139.05, 38.05], [139.55, 38.90], [139.95, 39.75],
        [140.00, 40.65]
    ];
    addLowPolyLand(HONSHU_NORTH_LONLAT, s1NeighborsMat, 0.30, 0.01, 0.24);

    // Хребты Хонсю (Оу и Японские Альпы)
    addLowPolyRidge(140.75, 39.85, 7.0, 1.30, 9.5, 0.15, s1NeighborsMat, 0.32);
    addLowPolyRidge(140.35, 38.35, 6.5, 1.20, 8.0, -0.1, s1NeighborsMat, 0.32);
    addLowPolyRidge(138.60, 36.25, 8.0, 1.45, 7.5, 0.30, s1NeighborsMat, 0.32);

    // -----------------------------------------------------------------
    // 3. САХАЛИНСКИЕ КУРИЛЫ СПРАВА (Курильская гряда с вулканами)
    // -----------------------------------------------------------------
    // Крупные вытянутые острова: Кунашир, Итуруп, Уруп, Симушир, Парамушир
    const KUNASHIR_LONLAT = [
        [145.42, 43.72], [145.78, 43.82], [146.52, 44.46],
        [146.22, 44.52], [145.55, 44.05]
    ];
    addLowPolyLand(KUNASHIR_LONLAT, s1KurilsMat, 0.28, 0.01, 0.14);
    addLowPolyRidge(146.18, 44.32, 2.2, 1.05, 2.2, 0.4, s1KurilsMat, 0.28);

    const ITURUP_LONLAT = [
        [146.92, 44.45], [147.62, 44.78], [148.88, 45.42], [148.72, 45.56],
        [147.82, 45.22], [147.18, 44.82]
    ];
    addLowPolyLand(ITURUP_LONLAT, s1KurilsMat, 0.30, 0.01, 0.16);
    addLowPolyRidge(147.55, 44.85, 2.6, 1.15, 2.4, 0.2, s1KurilsMat, 0.30);
    addLowPolyRidge(148.45, 45.32, 2.4, 1.10, 2.2, -0.3, s1KurilsMat, 0.30);

    const URUP_LONLAT = [
        [149.45, 45.58], [150.52, 46.12], [150.32, 46.26], [149.35, 45.72]
    ];
    addLowPolyLand(URUP_LONLAT, s1KurilsMat, 0.28, 0.01, 0.14);
    addLowPolyRidge(149.95, 45.92, 2.3, 1.0, 2.0, 0.5, s1KurilsMat, 0.28);

    const SIMUSHIR_LONLAT = [
        [151.68, 46.80], [152.28, 47.10], [152.12, 47.20], [151.58, 46.88]
    ];
    addLowPolyLand(SIMUSHIR_LONLAT, s1KurilsMat, 0.26, 0.01, 0.12);
    addLowPolyRidge(151.95, 47.00, 1.8, 0.95, 1.8, 0.2, s1KurilsMat, 0.26);

    const PARAMUSHIR_LONLAT = [
        [155.35, 50.05], [156.28, 50.68], [156.02, 50.78], [155.18, 50.20]
    ];
    addLowPolyLand(PARAMUSHIR_LONLAT, s1KurilsMat, 0.28, 0.01, 0.15);
    addLowPolyRidge(155.75, 50.42, 2.5, 1.15, 2.3, 0.3, s1KurilsMat, 0.28);

    // Малая Курильская гряда и вулканические острова центральной/северной дуги
    const SMALL_KURILS = [
        { lon: 146.75, lat: 43.80, r: 2.3, h: 0.72 }, // Шикотан
        { lon: 146.18, lat: 43.52, r: 1.4, h: 0.42 }, // Хабомаи (Зелёный)
        { lon: 150.85, lat: 46.52, r: 1.5, h: 0.65 }, // Чёрные Братья
        { lon: 152.48, lat: 47.35, r: 1.6, h: 0.80 }, // Кетой
        { lon: 153.02, lat: 47.76, r: 1.5, h: 0.78 }, // Расшуа
        { lon: 153.20, lat: 48.08, r: 1.6, h: 0.92 }, // Матуа
        { lon: 154.08, lat: 48.82, r: 2.0, h: 0.90 }, // Шиашкотан
        { lon: 154.72, lat: 49.45, r: 2.4, h: 1.05 }  // Онекотан
    ];
    const smallIslandGeo = new THREE.CylinderGeometry(0.75, 1.0, 0.26, 6);
    SMALL_KURILS.forEach((isl, idx) => {
        const [ix, iz] = lonLatToXZ(isl.lon, isl.lat);
        const base = new THREE.Mesh(smallIslandGeo, s1KurilsMat);
        base.scale.set(isl.r, 1, isl.r * 0.82);
        base.rotation.y = idx * 0.7;
        base.position.set(ix, 0.14, iz);
        base.receiveShadow = true;
        s1NeighborsGroup.add(base);

        addLowPolyRidge(isl.lon, isl.lat, isl.r * 0.72, isl.h, isl.r * 0.68, idx * 0.5, s1KurilsMat, 0.24);
    });

    updateNeighborLandsColor();
}

function buildSakhalin1NauticalGrid() {
    s1NauticalGridGroup = new THREE.Group();
    s1NauticalGridGroup.visible = isGridVisible && isFarEastProject();
    sakhalin1Group.add(s1NauticalGridGroup);

    const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.28
    });

    const lats = [38, 42, 46, 50, 54, 58, 62];
    const lons = [115, 120, 125, 130, 135, 140, 145, 150, 155];

    // Параллели (°N), аккуратно повторяющие рельеф материка и океана
    lats.forEach(lat => {
        const pts = [];
        const steps = 44;
        for (let s = 0; s <= steps; s++) {
            const lon = 110 + (s / steps) * 48;
            const [x, z] = lonLatToXZ(lon, lat);
            const y = Math.max(0.42, getAnyLandElevation(x, z) + 0.28);
            pts.push(new THREE.Vector3(x, y, z));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        s1NauticalGridGroup.add(new THREE.Line(geo, lineMat));
    });

    // Меридианы (°E)
    lons.forEach(lon => {
        const pts = [];
        const steps = 40;
        for (let s = 0; s <= steps; s++) {
            const lat = 36 + (s / steps) * 28;
            const [x, z] = lonLatToXZ(lon, lat);
            const y = Math.max(0.42, getAnyLandElevation(x, z) + 0.28);
            pts.push(new THREE.Vector3(x, y, z));
        }
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        s1NauticalGridGroup.add(new THREE.Line(geo, lineMat));
    });

    // Подписи градусов сетки для вкладки «Сахалин-1»
    const layer = document.getElementById('markers-layer');
    s1GridDomList = [];
    const s1GridMarkers = [
        { text: '62°N', lon: 150.5, lat: 62.0 },
        { text: '58°N', lon: 150.5, lat: 58.0 },
        { text: '54°N', lon: 150.5, lat: 54.0 },
        { text: '50°N', lon: 150.5, lat: 50.0 },
        { text: '46°N', lon: 150.5, lat: 46.0 },
        { text: '42°N', lon: 150.5, lat: 42.0 },
        { text: '120°E', lon: 120.0, lat: 39.2 },
        { text: '125°E', lon: 125.0, lat: 39.2 },
        { text: '130°E', lon: 130.0, lat: 39.2 },
        { text: '135°E', lon: 135.0, lat: 39.2 },
        { text: '140°E', lon: 140.0, lat: 39.2 },
        { text: '145°E', lon: 145.0, lat: 39.2 },
        { text: '150°E', lon: 150.0, lat: 39.2 }
    ];
    s1GridMarkers.forEach(gm => {
        const [gx, gz] = lonLatToXZ(gm.lon, gm.lat);
        const el = document.createElement('div');
        el.className = 'grid-label-3d';
        el.textContent = gm.text;
        el.style.display = 'none';
        layer.appendChild(el);
        s1GridDomList.push({
            el,
            worldPos: new THREE.Vector3(gx, 0.85, gz),
            lastX: -9999,
            lastY: -9999,
            visible: false
        });
    });
}

