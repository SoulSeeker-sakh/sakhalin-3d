'use strict';

// =========================================================================
// [BLOCK:FAR_EAST_ALIVE]
// 14. ЖИВОЙ ДАЛЬНИЙ ВОСТОК (v20):
//     Реки и озёра (с замерзанием зимой), Русский и Амурский мосты,
//     Космодром «Восточный» с запуском ракеты, паром Ванино — Холмск,
//     3 авиамаршрута, природные памятники, киты у Шантар и дым вулкана Тятя
// =========================================================================
const farEastAlive = {
    built: false,
    group: null,
    waterMat: null,
    russkyIslandMat: null,
    bridgeGlowMats: [],
    ferryGroup: null,
    ferryCurve: null,
    ferryProgress: 0.15,
    ferryDir: 1,
    planes: [],
    rocket: {
        group: null,
        flame: null,
        plumePuffs: [],
        padPos: null,
        cycleTime: 5.0,
        cycleDuration: 24.0
    },
    volcanoPuffs: [],
    whaleSpouts: [],
    domLabels: []
};

const _feWaterDaySummer = new THREE.Color(0x166494);
const _feWaterDayWinter = new THREE.Color(0xbcdaf0);
const _feWaterNightSummer = new THREE.Color(0x0b2a47);
const _feWaterNightWinter = new THREE.Color(0x456682);
const _feWaterTmpDay = new THREE.Color();
const _feWaterTmpNight = new THREE.Color();
const _feProjVec = new THREE.Vector3();
const _fePlanePos = new THREE.Vector3();
const _fePlaneNext = new THREE.Vector3();

// Построение аккуратной 3D-ленты реки с естественным выходом устья в море на береговой линии (v24)
function createRiverRibbonMesh(lonLatPoints, widthStart, widthEnd, samples, mat, opts) {
    const options = opts || {};
    const taperEnd = Boolean(options.taperEnd);
    const rawPts = lonLatPoints.map(([lon, lat]) => {
        const [x, z] = lonLatToXZ(lon, lat);
        return new THREE.Vector3(x, 0, z);
    });
    const curve = new THREE.CatmullRomCurve3(rawPts, false, 'centripetal');
    const sampled = curve.getPoints(samples);

    const positions = new Float32Array((samples + 1) * 2 * 3);
    const indices = [];

    for (let i = 0; i <= samples; i++) {
        const p = sampled[i];
        const prev = sampled[Math.max(0, i - 1)];
        const next = sampled[Math.min(samples, i + 1)];
        let tx = next.x - prev.x;
        let tz = next.z - prev.z;
        const tLen = Math.hypot(tx, tz) || 1;
        tx /= tLen;
        tz /= tLen;

        const nx = -tz;
        const nz = tx;
        const t = i / samples;

        // Мягкое расширение устья перед впадением в Амурский лиман и плавное растворение на подводном кончике
        let widthScale = 1.0;
        if (taperEnd && t > 0.85) {
            const u = (t - 0.85) / 0.15;
            widthScale = 1.0 + Math.sin(u * Math.PI * 0.85) * 0.42 - Math.pow(u, 3) * 0.16;
        }
        const halfW = (widthStart + (widthEnd - widthStart) * t) * 0.5 * widthScale;

        const lx = p.x + nx * halfW;
        const lz = p.z + nz * halfW;
        const rx = p.x - nx * halfW;
        const rz = p.z - nz * halfW;

        const rawMid = getAnyLandElevation(p.x, p.z);
        const rawLeft = getAnyLandElevation(lx, lz);
        const rawRight = getAnyLandElevation(rx, rz);
        const maxRaw = Math.max(rawMid, rawLeft, rawRight);

        let baseH = Math.max(0.24, maxRaw) + 0.14;

        if (taperEnd && t > 0.84) {
            // Пока хотя бы один берег ещё над сглаженным склоном суши (maxRaw > 0.04), река идёт НАД рельефом без разрыва;
            // как только русло реально вышло в открытую воду Амурского лимана — мягко опускается к уровню моря
            const inWaterBlend = maxRaw < 0.10 ? Math.min(1.0, (0.10 - maxRaw) / 0.42) : 0.0;
            const endBlend = t > 0.94 ? ((t - 0.94) / 0.06) : 0.0;
            const smoothWater = inWaterBlend * inWaterBlend * (3.0 - 2.0 * inWaterBlend);
            const smoothEnd = endBlend * endBlend * (3.0 - 2.0 * endBlend);
            const seaMix = Math.max(smoothWater, smoothEnd * 0.85);
            const seaTargetY = 0.055 - smoothEnd * 0.085;
            const landSafeY = Math.max(0.06, maxRaw + 0.10);
            baseH = Math.max(
                maxRaw > -0.04 ? landSafeY : -0.05,
                baseH * (1.0 - seaMix) + seaTargetY * seaMix
            );
        }

        const vIdx = i * 6;
        positions[vIdx]     = lx;
        positions[vIdx + 1] = baseH;
        positions[vIdx + 2] = lz;
        positions[vIdx + 3] = rx;
        positions[vIdx + 4] = baseH;
        positions[vIdx + 5] = rz;

        if (i < samples) {
            const a = i * 2;
            const b = a + 1;
            const c = a + 2;
            const d = a + 3;
            indices.push(a, c, b, b, c, d);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    return mesh;
}

// Построение гладкого озера с естественной береговой кромкой (сплайн вместо угловатого многоугольника)
function createSmoothLakeMesh(lonLatControlRing, waterMat, shoreMat, extraY) {
    const group = new THREE.Group();
    const ctrlPts = lonLatControlRing.map(([lon, lat]) => {
        const [x, z] = lonLatToXZ(lon, lat);
        return new THREE.Vector3(x, 0, z);
    });
    const closedCurve = new THREE.CatmullRomCurve3(ctrlPts, true, 'centripetal');
    const smoothPts = closedCurve.getPoints(56);

    let sumX = 0, sumZ = 0, elevSum = 0, elevMax = 0.30;
    const waterShape = new THREE.Shape();
    smoothPts.forEach((pt, idx) => {
        sumX += pt.x;
        sumZ += pt.z;
        const h = Math.max(0.28, getAnyLandElevation(pt.x, pt.z));
        elevSum += h;
        if (h > elevMax) elevMax = h;
        if (idx === 0) waterShape.moveTo(pt.x, -pt.z);
        else waterShape.lineTo(pt.x, -pt.z);
    });
    waterShape.closePath();

    const cx = sumX / smoothPts.length;
    const cz = sumZ / smoothPts.length;
    const centerH = Math.max(0.28, getAnyLandElevation(cx, cz));
    const avgH = elevSum / smoothPts.length;
    // Ставим гладь озера ровно чуть выше локального рельефа, без вылета вверх
    const lakeY = Math.max(centerH, avgH * 0.55 + elevMax * 0.45) + (extraY || 0.13);

    // Мягкая береговая полоса вокруг озера (1.07x от центра)
    if (shoreMat) {
        const shoreShape = new THREE.Shape();
        smoothPts.forEach((pt, idx) => {
            const sx = cx + (pt.x - cx) * 1.07;
            const sz = cz + (pt.z - cz) * 1.07;
            if (idx === 0) shoreShape.moveTo(sx, -sz);
            else shoreShape.lineTo(sx, -sz);
        });
        shoreShape.closePath();
        const shoreGeo = new THREE.ShapeGeometry(shoreShape, 2);
        shoreGeo.rotateX(-Math.PI / 2);
        const shoreMesh = new THREE.Mesh(shoreGeo, shoreMat);
        shoreMesh.position.y = lakeY - 0.03;
        shoreMesh.receiveShadow = true;
        group.add(shoreMesh);
    }

    const waterGeo = new THREE.ShapeGeometry(waterShape, 2);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = lakeY;
    waterMesh.receiveShadow = true;
    group.add(waterMesh);
    return group;
}

// 1) Главные реки Дальнего Востока (Амур, Уссури, Зея, Бурея) и гладкое озеро Ханка
function buildFarEastRiversAndLakes() {
    farEastAlive.waterMat = new THREE.MeshStandardMaterial({
        color: 0x166494,
        roughness: 0.28,
        metalness: 0.18,
        flatShading: true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
    });

    farEastAlive.shoreRimMat = new THREE.MeshStandardMaterial({
        color: 0x3f6b58,
        roughness: 0.88,
        metalness: 0.02,
        flatShading: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });

    // Река Амур: верхнее течение (1-в-1 вдоль белой границы региона) -> Хабаровск -> Комсомольск -> Николаевск -> аккуратный выход в устье (не доходит до Сахалина!)
    const AMUR_BORDER = (typeof FAR_EAST_AMUR_BORDER_LONLAT !== 'undefined')
        ? FAR_EAST_AMUR_BORDER_LONLAT
        : [
            [124.34, 53.40], [125.24, 52.92], [126.34, 52.12], [126.98, 51.12],
            [127.62, 50.32], [128.86, 49.54], [130.05, 48.94], [130.95, 48.22],
            [131.92, 47.88], [133.14, 47.82], [134.08, 48.14], [134.72, 48.28]
        ];
    const AMUR_LONLAT = AMUR_BORDER.concat([
        [134.86, 48.72], [135.28, 49.18], [135.94, 49.88], [136.70, 50.68],
        [137.74, 51.52], [138.86, 52.22], [139.84, 52.78], [140.55, 53.10],
        [140.82, 53.12], [141.02, 53.11]
    ]);
    farEastAlive.group.add(createRiverRibbonMesh(AMUR_LONLAT, 2.20, 2.65, 220, farEastAlive.waterMat, { taperEnd: true }));

    // Река Уссури: строго вдоль белой границы от оз. Ханка до слияния с Амуром у Хабаровска (аккуратно перекрывает стык с Китаем!)
    const USSURI_BORDER = (typeof FAR_EAST_USSURI_BORDER_LONLAT !== 'undefined')
        ? FAR_EAST_USSURI_BORDER_LONLAT
        : [
            [132.68, 45.14], [133.36, 45.38], [133.72, 46.00],
            [133.96, 46.74], [134.38, 47.56], [134.72, 48.28]
        ];
    const USSURI_LONLAT = [[132.48, 45.02]].concat(USSURI_BORDER, [[134.86, 48.72]]);
    farEastAlive.group.add(createRiverRibbonMesh(USSURI_LONLAT, 1.72, 2.05, 110, farEastAlive.waterMat));

    // Плавный узел слияния Амура и Уссури у Хабаровска (закрывает острый угол без треугольной дырки)
    const [confX, confZ] = lonLatToXZ(134.68, 48.26);
    const confH = Math.max(0.24, getAnyLandElevation(confX, confZ)) + 0.14;
    const confluenceDisc = new THREE.Mesh(new THREE.CircleGeometry(1.55, 18), farEastAlive.waterMat);
    confluenceDisc.rotation.x = -Math.PI / 2;
    confluenceDisc.position.set(confX, confH, confZ);
    farEastAlive.group.add(confluenceDisc);

    // Река Зея (заканчивается строго в русле Амура у Благовещенска, не выходя в Китай!)
    const ZEYA_LONLAT = [
        [127.70, 54.42], [128.18, 53.72], [128.12, 52.78], [128.00, 51.82],
        [127.84, 50.92], [127.66, 50.36]
    ];
    farEastAlive.group.add(createRiverRibbonMesh(ZEYA_LONLAT, 0.72, 1.15, 48, farEastAlive.waterMat));

    // Река Бурея (заканчивается строго в русле Амура, не выходя в Китай!)
    const BUREYA_LONLAT = [
        [131.55, 51.38], [130.92, 50.72], [130.25, 50.06], [129.68, 49.46], [129.46, 49.24]
    ];
    farEastAlive.group.add(createRiverRibbonMesh(BUREYA_LONLAT, 0.60, 0.96, 40, farEastAlive.waterMat));

    // Озеро Ханка: плотно примыкает к западной границе [131.95, 44.92] -> [132.55, 45.10] и истоку Уссури без щели
    const KHANKA_SMOOTH_LONLAT = [
        [132.14, 45.28], [132.46, 45.32], [132.64, 45.20], [132.72, 45.06],
        [132.76, 44.90], [132.74, 44.74], [132.60, 44.60], [132.38, 44.56],
        [132.14, 44.62], [131.98, 44.78], [131.92, 44.94], [131.98, 45.12]
    ];
    farEastAlive.group.add(createSmoothLakeMesh(KHANKA_SMOOTH_LONLAT, farEastAlive.waterMat, farEastAlive.shoreRimMat, 0.14));
}

// Построение миниатюрного низкополигонального острова Русский (на южном конце Русского моста)
function buildRusskyIslandMesh(centerX, centerZ) {
    farEastAlive.russkyIslandMat = new THREE.MeshStandardMaterial({
        color: 0x3c7d52,
        roughness: 0.84,
        metalness: 0.04,
        flatShading: true
    });

    const islGroup = new THREE.Group();
    islGroup.position.set(centerX, 0.0, centerZ);

    // Органичный силуэт острова Русский с бухтой Новик
    const pts = [
        [-1.9, -1.6], [0.4, -2.1], [2.4, -1.2], [2.8, 0.7],
        [1.6, 2.3], [-0.8, 2.5], [-2.5, 1.3], [-2.3, -0.3]
    ];
    const sh = new THREE.Shape();
    pts.forEach(([x, z], idx) => {
        if (idx === 0) sh.moveTo(x, -z);
        else sh.lineTo(x, -z);
    });
    sh.closePath();

    const geo = new THREE.ExtrudeGeometry(sh, {
        depth: 0.42,
        bevelEnabled: true,
        bevelThickness: 0.10,
        bevelSize: 0.22,
        bevelSegments: 1,
        curveSegments: 2
    });
    geo.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(geo, farEastAlive.russkyIslandMat);
    body.position.y = 0.02;
    body.receiveShadow = true;
    islGroup.add(body);

    // Два небольших лоу-поли холма на южной половине острова (чтобы не перекрывать устой Русского моста)
    const hillGeo = new THREE.ConeGeometry(1.15, 0.65, 5);
    const h1 = new THREE.Mesh(hillGeo, farEastAlive.russkyIslandMat);
    h1.position.set(0.55, 0.72, 0.85);
    h1.scale.set(1.05, 0.95, 0.85);
    islGroup.add(h1);

    const h2 = new THREE.Mesh(hillGeo, farEastAlive.russkyIslandMat);
    h2.position.set(-0.85, 0.62, 1.15);
    h2.scale.set(0.82, 0.80, 0.82);
    islGroup.add(h2);

    return islGroup;
}

// 2) Русский мост (в проливе южнее терминала Владивостока -> о. Русский) + Амурский мост (поперёк Амура, отдельно от узла Хабаровска)
function buildFarEastBridges() {
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.62, flatShading: true });
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75, flatShading: true });

    // --- РУССКИЙ МОСТ: северный устой на зелёном берегу Приморья -> пролив -> о. Русский, гарантированно выше рельефа! ---
    const [vlTermX, vlTermZ] = lonLatToXZ(131.88, 43.12);
    // Пробиваем луч строго с суши (восточнее терминала Владивостока) на юг в пролив
    const [landStartX, landStartZ] = lonLatToXZ(132.20, 43.36);
    const [seaEndX, seaEndZ] = lonLatToXZ(132.28, 42.50);

    let shoreX = (landStartX + seaEndX) * 0.5;
    let shoreZ = (landStartZ + seaEndZ) * 0.5;
    for (let step = 0; step <= 160; step++) {
        const f = step / 160;
        const px = landStartX + (seaEndX - landStartX) * f;
        const pz = landStartZ + (seaEndZ - landStartZ) * f;
        // Используем реальную высоту сглаженной сетки материка, чтобы мост начинался на видимой кромке берега
        const onLand = getAnyLandElevation(px, pz) > 0.22;
        if (onLand) {
            shoreX = px;
            shoreZ = pz;
        } else if (step > 8) {
            break;
        }
    }

    // Единичный вектор от берега в сторону пролива (на юг к о. Русский)
    let dirOutX = seaEndX - shoreX;
    let dirOutZ = seaEndZ - shoreZ;
    const dLen = Math.hypot(dirOutX, dirOutZ) || 1;
    dirOutX /= dLen;
    dirOutZ /= dLen;

    // Гарантируем комфортную дистанцию от терминала Владивостока
    if (Math.hypot(shoreX - vlTermX, shoreZ - vlTermZ) < 3.8) {
        shoreX += 1.8;
    }

    // Северный устой опирается в берег (-1.6 ед.), южный — выходит на 5.6 ед. в пролив к о. Русский
    const rStartX = shoreX - dirOutX * 1.60;
    const rStartZ = shoreZ - dirOutZ * 1.60;
    const rEndX = shoreX + dirOutX * 5.60;
    const rEndZ = shoreZ + dirOutZ * 5.60;
    const rMidX = (rStartX + rEndX) * 0.5;
    const rMidZ = (rStartZ + rEndZ) * 0.5;
    const rSpanLen = Math.hypot(rEndX - rStartX, rEndZ - rStartZ);
    const rAngle = Math.atan2(-(rEndZ - rStartZ), rEndX - rStartX);

    // Измеряем реальную максимальную высоту рельефа под всей трассой моста, чтобы полотно НИКОГДА не утопало в земле
    let maxUnderBridgeH = 0.54;
    for (let s = 0; s <= 16; s++) {
        const u = s / 16;
        const sx = rStartX + (rEndX - rStartX) * u;
        const sz = rStartZ + (rEndZ - rStartZ) * u;
        const h = getAnyLandElevation(sx, sz);
        if (h > maxUnderBridgeH) maxUnderBridgeH = h;
    }
    const deckY = Math.max(1.38, maxUnderBridgeH + 0.30);

    // Центр моста для точной привязки его метки
    farEastAlive.russkyBridgeMid = new THREE.Vector3(rMidX, deckY + 2.95, rMidZ);

    // Остров Русский плотно принимает южный устой моста (сохраняем точные координаты острова для ГРС «о. Русский»)
    const russkyX = rEndX + dirOutX * 1.65;
    const russkyZ = rEndZ + dirOutZ * 1.65;
    farEastAlive.russkyIslandPos = new THREE.Vector3(russkyX, 0.54, russkyZ);
    farEastAlive.group.add(buildRusskyIslandMesh(russkyX, russkyZ));

    const russkyGroup = new THREE.Group();
    russkyGroup.position.set(rMidX, 0.0, rMidZ);
    russkyGroup.rotation.y = rAngle;

    // Мощные береговые устои от дна/склона (-0.55) до уровня проезжей части (deckY)
    const abutHeight = deckY + 0.55;
    const abutGeo = new THREE.BoxGeometry(1.18, abutHeight, 0.78);
    const abutL = new THREE.Mesh(abutGeo, concreteMat);
    abutL.position.set(-rSpanLen * 0.47, deckY - abutHeight * 0.5, 0);
    russkyGroup.add(abutL);
    const abutR = new THREE.Mesh(abutGeo, concreteMat);
    abutR.position.set(rSpanLen * 0.47, deckY - abutHeight * 0.5, 0);
    russkyGroup.add(abutR);

    // Дорожное полотно чётко над берегом, проливом и островом
    const deck = new THREE.Mesh(new THREE.BoxGeometry(rSpanLen + 0.40, 0.18, 0.50), deckMat);
    deck.position.y = deckY;
    russkyGroup.add(deck);

    // Два фирменных А-образных пилона (опоры уходят в воду/дно на -0.55, вершины возвышаются на +2.55 над полотном)
    const pylonOff = rSpanLen * 0.21;
    const pylonXs = [-pylonOff, pylonOff];
    const pylonTopY = deckY + 2.55;
    const legHeight = pylonTopY + 0.55;
    const legCenterY = (pylonTopY - 0.55) * 0.5;
    const cablePts = [];
    pylonXs.forEach(px => {
        // Массивные бетонные фундаменты-ростверки пилонов в воде
        const pierBase = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.78, 0.78), concreteMat);
        pierBase.position.set(px, 0.14, 0);
        russkyGroup.add(pierBase);

        const legGeo = new THREE.BoxGeometry(0.17, legHeight, 0.15);
        const legL = new THREE.Mesh(legGeo, concreteMat);
        legL.position.set(px, legCenterY, -0.23);
        legL.rotation.x = 0.095;
        russkyGroup.add(legL);

        const legR = new THREE.Mesh(legGeo, concreteMat);
        legR.position.set(px, legCenterY, 0.23);
        legR.rotation.x = -0.095;
        russkyGroup.add(legR);

        // Поперечная балка пилона под дорожным полотном
        const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.58), concreteMat);
        crossBeam.position.set(px, deckY - 0.14, 0);
        russkyGroup.add(crossBeam);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.28), concreteMat);
        cap.position.set(px, pylonTopY, 0);
        russkyGroup.add(cap);

        for (let k = 1; k <= 4; k++) {
            const topY = pylonTopY - 0.10 - (k - 1) * 0.22;
            const spanOff = k * (rSpanLen * 0.056);
            cablePts.push(
                new THREE.Vector3(px, topY, 0), new THREE.Vector3(px - spanOff, deckY + 0.06, 0.18),
                new THREE.Vector3(px, topY, 0), new THREE.Vector3(px + spanOff, deckY + 0.06, 0.18),
                new THREE.Vector3(px, topY, 0), new THREE.Vector3(px - spanOff, deckY + 0.06, -0.18),
                new THREE.Vector3(px, topY, 0), new THREE.Vector3(px + spanOff, deckY + 0.06, -0.18)
            );
        }
    });

    const cableMat = new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.90 });
    russkyGroup.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cablePts), cableMat));

    // Ночная архитектурная подсветка Русского моста
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 });
    const deckGlow = new THREE.Mesh(new THREE.BoxGeometry(rSpanLen * 0.96, 0.09, 0.56), glowMat);
    deckGlow.position.y = deckY + 0.09;
    russkyGroup.add(deckGlow);
    farEastAlive.bridgeGlowMats.push(glowMat);

    farEastAlive.group.add(russkyGroup);

    // --- АМУРСКИЙ МОСТ (вынесен северо-западнее узла Хабаровска, стоит строго поперёк русла Амура) ---
    const [ax, az] = lonLatToXZ(134.86, 48.72);
    const [axPrev, azPrev] = lonLatToXZ(134.58, 48.38);
    const [axNext, azNext] = lonLatToXZ(135.38, 49.02);
    const rdx = axNext - axPrev;
    const rdz = azNext - azPrev;
    // Перпендикулярно вектору течения Амура (rdx, rdz)
    const amurAngle = Math.atan2(-rdx, -rdz);

    const ay = Math.max(0.36, getAnyLandElevation(ax, az)) + 0.18;
    const amurBridge = new THREE.Group();
    amurBridge.position.set(ax, ay, az);
    amurBridge.rotation.y = amurAngle;

    const amurDeck = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.14, 0.38), deckMat);
    amurDeck.position.y = 0.44;
    amurBridge.add(amurDeck);

    const archMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.55, metalness: 0.35, flatShading: true });
    for (let s = -2; s <= 2; s++) {
        const sx = s * 0.98;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.40), concreteMat);
        pier.position.set(sx - 0.49, 0.20, 0);
        amurBridge.add(pier);

        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.055, 4, 8, Math.PI), archMat);
        arch.position.set(sx, 0.48, 0);
        amurBridge.add(arch);
    }
    // Правый крайний устой
    const endPier = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.56, 0.40), concreteMat);
    endPier.position.set(2 * 0.98 + 0.49, 0.20, 0);
    amurBridge.add(endPier);

    const amurGlowMat = new THREE.MeshBasicMaterial({ color: 0xfde68a, transparent: true, opacity: 0.0 });
    const amurLights = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.06, 0.42), amurGlowMat);
    amurLights.position.y = 0.52;
    amurBridge.add(amurLights);
    farEastAlive.bridgeGlowMats.push(amurGlowMat);

    farEastAlive.group.add(amurBridge);
}

// 3) Космодром «Восточный» (Амурская область) с анимированным запуском ракеты
function buildVostochnyCosmodrome() {
    const [vx, vz] = lonLatToXZ(128.33, 51.88);
    const vy = Math.max(0.42, getFarEastElevation(vx, vz)) + 0.04;

    const padGroup = new THREE.Group();
    padGroup.position.set(vx, vy, vz);
    farEastAlive.group.add(padGroup);
    farEastAlive.rocket.padPos = new THREE.Vector3(vx, vy, vz);

    // Бетонная стартовая площадка
    const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(1.75, 2.05, 0.24, 6),
        new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, flatShading: true })
    );
    pad.position.y = 0.12;
    padGroup.add(pad);

    // Мобильная башня обслуживания (фирменный сине-белый цвет «Восточного»)
    const tower = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 2.15, 0.68),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5, flatShading: true })
    );
    tower.position.set(-0.92, 1.24, -0.35);
    padGroup.add(tower);

    const towerRoof = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.25, 0.76),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6, flatShading: true })
    );
    towerRoof.position.set(-0.92, 2.40, -0.35);
    padGroup.add(towerRoof);

    // 3D-ракета «Союз»
    const rGroup = new THREE.Group();
    rGroup.position.set(0.15, 0.24, 0.10);
    padGroup.add(rGroup);

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, flatShading: true });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5, flatShading: true });

    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.15, 6), bodyMat);
    core.position.y = 1.15;
    rGroup.add(core);

    const fairing = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 6), bodyMat);
    fairing.position.y = 2.52;
    rGroup.add(fairing);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.26, 6), orangeMat);
    band.position.y = 1.65;
    rGroup.add(band);

    for (let b = 0; b < 4; b++) {
        const ang = (b / 4) * Math.PI * 2;
        const booster = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.95, 5), bodyMat);
        booster.position.set(Math.cos(ang) * 0.21, 0.50, Math.sin(ang) * 0.21);
        rGroup.add(booster);
    }

    // Пламя двигателя при старте
    const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 1.55, 6),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.0 })
    );
    flame.rotation.x = Math.PI;
    flame.position.y = -0.68;
    rGroup.add(flame);

    farEastAlive.rocket.group = rGroup;
    farEastAlive.rocket.flame = flame;

    // Клубы стартового дыма (лоу-поли сферы)
    const puffGeo = new THREE.DodecahedronGeometry(0.52, 0);
    farEastAlive.rocket.plumePuffs = [];
    for (let p = 0; p < 10; p++) {
        const pMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.0 });
        const pm = new THREE.Mesh(puffGeo, pMat);
        pm.visible = false;
        padGroup.add(pm);
        farEastAlive.rocket.plumePuffs.push({
            mesh: pm,
            mat: pMat,
            ang: (p / 10) * Math.PI * 2,
            delay: p * 0.11,
            drift: 1.4 + (p % 3) * 0.65
        });
    }
}

// 4) Паромная переправа Ванино — Холмск через Татарский пролив (обновлённый дизайн судна)
function buildVaninoKholmskFerry() {
    const routeLonLat = [
        [140.29, 49.08], // Порт Ванино
        [140.82, 48.42],
        [141.45, 47.72],
        [142.02, 47.05]  // Порт Холмск
    ];
    const pts = routeLonLat.map(([lon, lat]) => {
        const [x, z] = lonLatToXZ(lon, lat);
        return new THREE.Vector3(x, 0.08, z);
    });
    farEastAlive.ferryCurve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');

    // Пунктирная морская линия переправы
    const lineGeo = new THREE.BufferGeometry().setFromPoints(farEastAlive.ferryCurve.getPoints(42));
    const lineMat = new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 1.4,
        gapSize: 1.1,
        transparent: true,
        opacity: 0.50
    });
    const ferryLine = new THREE.Line(lineGeo, lineMat);
    ferryLine.computeLineDistances();
    farEastAlive.group.add(ferryLine);

    // Обтекаемый корпус парома «Сахалин» (ExtrudeGeometry, ориентирован носом по +Z)
    const ferry = new THREE.Group();
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, 1.18);
    hullShape.quadraticCurveTo(0.36, 0.72, 0.36, 0.15);
    hullShape.lineTo(0.35, -0.95);
    hullShape.lineTo(-0.35, -0.95);
    hullShape.lineTo(-0.36, 0.15);
    hullShape.quadraticCurveTo(-0.36, 0.72, 0, 1.18);

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
        depth: 0.28,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.025,
        bevelSegments: 2
    });
    hullGeo.rotateX(Math.PI / 2);

    const hullMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.45, metalness: 0.18 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.48 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.25, metalness: 0.5 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.45 });

    const hullMesh = new THREE.Mesh(hullGeo, hullMat);
    hullMesh.position.y = 0.28;
    ferry.add(hullMesh);

    // Двухъярусная белая надстройка и ходовой мостик
    const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.22, 1.48), whiteMat);
    mainDeck.position.set(0, 0.40, -0.10);
    ferry.add(mainDeck);

    const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.18, 0.88), whiteMat);
    upperDeck.position.set(0, 0.58, 0.06);
    ferry.add(upperDeck);

    const bridgeWin = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.30), glassMat);
    bridgeWin.position.set(0, 0.60, 0.36);
    ferry.add(bridgeWin);

    // Фирменная труба и радарная мачта
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.32, 8), redMat);
    funnel.position.set(0, 0.78, -0.18);
    ferry.add(funnel);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.36, 6), whiteMat);
    mast.position.set(0, 0.84, 0.26);
    ferry.add(mast);

    ferry.position.copy(farEastAlive.ferryCurve.getPoint(0.15));
    ferry.position.y = 0.05;
    sakhalin1Group.add(ferry);
    farEastAlive.ferryGroup = ferry;
}

// 5) 3 авиамаршрута ДВ с анимированными 3D-самолётами и стробоскопами
function buildFarEastAirRoutes() {
    const routes = [
        { from: [131.88, 43.12], to: [135.08, 48.48], peakY: 16.5, speed: 0.052, phase: 0.05 }, // Владивосток <-> Хабаровск
        { from: [135.08, 48.48], to: [142.73, 46.96], peakY: 18.0, speed: 0.048, phase: 0.42 }, // Хабаровск <-> Южно-Сахалинск
        { from: [135.08, 48.48], to: [127.53, 50.29], peakY: 15.5, speed: 0.046, phase: 0.74 }  // Хабаровск <-> Благовещенск
    ];

    const planeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x38bdf8, emissiveIntensity: 0.22, roughness: 0.35, flatShading: true });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4, flatShading: true });
    const arcMat = new THREE.LineDashedMaterial({
        color: 0x7dd3fc,
        dashSize: 2.2,
        gapSize: 2.4,
        transparent: true,
        opacity: 0.36
    });

    routes.forEach((rt, idx) => {
        const [x1, z1] = lonLatToXZ(rt.from[0], rt.from[1]);
        const [x2, z2] = lonLatToXZ(rt.to[0], rt.to[1]);
        const y1 = Math.max(0.6, getAnyLandElevation(x1, z1)) + 1.2;
        const y2 = Math.max(0.6, getAnyLandElevation(x2, z2)) + 1.2;
        const mx = (x1 + x2) * 0.5;
        const mz = (z1 + z2) * 0.5;

        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(x1, y1, z1),
            new THREE.Vector3(mx, rt.peakY, mz),
            new THREE.Vector3(x2, y2, z2)
        );

        const arcLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(36)), arcMat);
        arcLine.computeLineDistances();
        farEastAlive.group.add(arcLine);

        // Миниатюрный 3D-самолёт (смотрит вдоль +Z для удобного lookAt)
        const plane = new THREE.Group();
        const fuselage = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.75, 5), planeMat);
        fuselage.rotation.x = Math.PI / 2;
        plane.add(fuselage);

        const wings = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 0.36), planeMat);
        wings.position.z = -0.10;
        plane.add(wings);

        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.46, 0.32), tailMat);
        tail.position.set(0, 0.22, -0.72);
        plane.add(tail);

        const strobeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 });
        const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), strobeMat);
        strobe.position.set(0, 0.14, 0.12);
        plane.add(strobe);

        farEastAlive.group.add(plane);
        farEastAlive.planes.push({
            mesh: plane,
            curve,
            strobeMat,
            t: rt.phase,
            dir: idx % 2 === 0 ? 1 : -1,
            speed: rt.speed,
            phase: idx * 2.1
        });
    });
}

// 6) Живые природные эффекты: дым вулкана Тятя (Кунашир) + фонтаны гренландских китов (Шантары)
function buildFarEastNatureEffects() {
    // Дымок над вулканом Тятя (о. Кунашир)
    const [tx, tz] = lonLatToXZ(146.25, 44.35);
    const smokeGeo = new THREE.DodecahedronGeometry(0.45, 0);
    farEastAlive.volcanoPuffs = [];
    for (let i = 0; i < 6; i++) {
        const sMat = new THREE.MeshBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.0 });
        const sm = new THREE.Mesh(smokeGeo, sMat);
        farEastAlive.group.add(sm);
        farEastAlive.volcanoPuffs.push({
            mesh: sm,
            mat: sMat,
            baseX: tx,
            baseY: 1.55,
            baseZ: tz,
            phase: i / 6
        });
    }

    // Фонтаны гренландских китов в бухте Шантарских островов
    const whaleSpots = [
        [137.45, 54.78],
        [137.88, 54.96],
        [137.18, 55.02]
    ];
    const spoutGeo = new THREE.ConeGeometry(0.32, 1.35, 5);
    spoutGeo.translate(0, 0.65, 0);
    farEastAlive.whaleSpouts = [];
    whaleSpots.forEach(([lon, lat], idx) => {
        const [wx, wz] = lonLatToXZ(lon, lat);
        const wMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.0 });
        const sp = new THREE.Mesh(spoutGeo, wMat);
        sp.position.set(wx, 0.08, wz);
        farEastAlive.group.add(sp);
        farEastAlive.whaleSpouts.push({
            mesh: sp,
            mat: wMat,
            phase: idx * 2.7
        });
    });
}

// 7) Метки природных памятников и 3D-символов ДВ (раскрываются при зуме по Zoom LOD)
function buildFarEastAliveDomLabels() {
    const layer = document.getElementById('markers-layer');
    if (!layer) return;

    const items = [
        // Природные памятники ДВ (управляются кнопкой слоя природы + Zoom LOD)
        { name: 'Шантарские о-ва',    lon: 137.60, lat: 54.90, kind: 'nature', yOff: 1.2 },
        { name: 'Хребет Сихотэ-Алинь',lon: 136.40, lat: 46.20, kind: 'nature', yOff: 2.2 },
        { name: 'Амурские столбы',    lon: 138.80, lat: 51.35, kind: 'nature', yOff: 1.4 },
        { name: 'Земля леопарда',     lon: 131.38, lat: 43.18, kind: 'nature', yOff: 1.2 },
        { name: 'Вулкан Тятя',        lon: 146.25, lat: 44.35, kind: 'nature', yOff: 2.1 },
        // 3D-символы ДВ (видны при приближении)
        { name: 'Русский мост',       lon: 132.05, lat: 42.86, kind: 'landmark', yOff: 3.5 },
        { name: 'Амурский мост',      lon: 134.86, lat: 48.72, kind: 'landmark', yOff: 2.2 },
        { name: 'Космодром «Восточный»', lon: 128.33, lat: 51.88, kind: 'landmark', yOff: 3.0 }
    ];

    farEastAlive.domLabels = [];
    items.forEach(item => {
        const [x, z] = lonLatToXZ(item.lon, item.lat);
        const y = Math.max(0.35, getAnyLandElevation(x, z)) + item.yOff;
        const el = document.createElement('div');
        if (item.kind === 'nature') {
            el.className = 'nature-marker-3d';
            el.innerHTML = '<span class="nature-dot"></span><span>' + item.name + '</span>';
        } else {
            el.className = 'fe-landmark-label-3d';
            el.textContent = item.name;
        }
        el.style.display = 'none';
        layer.appendChild(el);
        farEastAlive.domLabels.push({
            el,
            kind: item.kind,
            worldPos: (item.name === 'Русский мост' && farEastAlive.russkyBridgeMid) ? farEastAlive.russkyBridgeMid.clone() : new THREE.Vector3(x, y, z),
            visible: false,
            lastX: -9999,
            lastY: -9999
        });
    });
}

