'use strict';

// =========================================================================
// [BLOCK:FAR_EAST_S1]
// 8B. ЛЕНИВАЯ ИНИЦИАЛИЗАЦИЯ «САХАЛИН-1» И МАТЕРИКОВОГО ДАЛЬНЕГО ВОСТОКА
// =========================================================================
// Полный контур юга и центра Дальнего Востока: Хабаровский край (до Охотска), Приморский край, ЕАО и Амурская область
const FAR_EAST_COASTLINE_LONLAT = [
    // Северная граница Амурской области и Хабаровского края (Становой / Джугджур -> широкий плавный контур над Охотском)
    [124.40, 54.60], [125.20, 55.80], [127.00, 56.65], [129.80, 57.25],
    [132.80, 58.05], [136.00, 59.10], [139.20, 59.95], [142.20, 60.35],
    [144.45, 60.15], [144.35, 59.58],
    // Охотское побережье Хабаровского края: Охотск -> Аян -> Удская губа -> Тугур -> Николаевск -> мыс Лазарева
    [143.20, 59.36], [141.75, 59.06], [140.25, 58.25], [139.00, 57.30],
    [138.17, 56.45], [137.45, 55.65], [136.30, 55.05], [135.35, 54.72],
    [136.45, 54.22], [136.85, 53.88], [137.80, 54.22], [139.05, 53.95],
    [140.25, 54.12], [141.15, 53.70], [141.34, 53.30], [140.72, 53.16],
    [140.74, 53.06], [141.22, 52.82], [141.48, 52.23],
    // Татарский пролив и Японское море: Де-Кастри -> Совгавань -> побережье Приморского края -> Находка -> Владивосток -> Хасан
    [141.12, 51.84], [140.72, 51.47], [140.96, 51.20], [140.70, 50.62],
    [140.52, 49.95], [140.32, 49.25], [140.26, 48.96], [139.95, 48.32],
    [139.42, 47.62], [138.68, 46.85], [138.00, 46.02], [137.22, 45.30],
    [136.30, 44.58], [135.55, 43.95], [134.80, 43.32], [133.90, 42.90],
    [133.05, 42.68], [132.84, 42.84], [132.35, 42.92], [131.88, 43.12],
    [131.52, 42.96], [131.15, 42.62], [130.72, 42.32],
    // Западная граница Приморья (Хасан -> оз. Ханка -> река Уссури -> Хабаровск)
    [130.65, 42.95], [131.15, 43.75], [131.48, 44.38], [131.95, 44.92],
    [132.55, 45.10], [133.22, 45.35], [133.58, 45.98], [133.82, 46.72],
    [134.25, 47.55], [134.62, 48.18],
    // Граница ЕАО и Амурской области вдоль Амура на запад (Благовещенск -> верхний Амур)
    [134.05, 48.05], [133.10, 47.72], [131.85, 47.78], [130.85, 48.12],
    [129.95, 48.85], [128.75, 49.45], [127.50, 50.24], [126.85, 51.05],
    [126.20, 52.05], [125.10, 52.85], [124.20, 53.35]
];

// Единые контрольные точки приграничных русел (сдвинуты на ~0.11° внутрь, чтобы русло и белая граница плотно прилегали к зелёному краю ДВ без серого зазора)
const FAR_EAST_AMUR_BORDER_LONLAT = [
    [124.34, 53.40], [125.24, 52.92], [126.34, 52.12], [126.98, 51.12],
    [127.62, 50.32], [128.86, 49.54], [130.05, 48.94], [130.95, 48.22],
    [131.92, 47.88], [133.14, 47.82], [134.08, 48.14], [134.72, 48.28]
];

const FAR_EAST_USSURI_BORDER_LONLAT = [
    [132.68, 45.14], [133.36, 45.38], [133.72, 46.00], [133.96, 46.74],
    [134.38, 47.56], [134.72, 48.28]
];

let farEastMeshGrid = null;

function buildFarEastCoastline() {
    const rawVecs = [];
    for (let i = 0; i < FAR_EAST_COASTLINE_LONLAT.length; i++) {
        const [x, z] = lonLatToXZ(FAR_EAST_COASTLINE_LONLAT[i][0], FAR_EAST_COASTLINE_LONLAT[i][1]);
        rawVecs.push(new THREE.Vector3(x, 0, z));
    }
    const curve = new THREE.CatmullRomCurve3(rawVecs, true, 'centripetal');
    const sampled = curve.getPoints(280);
    farEastOutline = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < sampled.length; i++) {
        const px = sampled[i].x;
        const pz = sampled[i].z;
        if (!Number.isFinite(px) || !Number.isFinite(pz)) continue;
        farEastOutline.push([px, pz]);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (pz < minZ) minZ = pz;
        if (pz > maxZ) maxZ = pz;
    }
    farEastAABB = {
        minX: minX - 6.0,
        maxX: maxX + 6.0,
        minZ: minZ - 6.0,
        maxZ: maxZ + 6.0
    };

    // Z-индекс сегментов береговой линии материка для мгновенного построения рельефа
    farEastZBuckets = Array.from({ length: FAR_EAST_BUCKET_COUNT }, () => []);
    const zSpan = farEastAABB.maxZ - farEastAABB.minZ;
    const margin = 7.5;
    for (let i = 0; i < farEastOutline.length; i++) {
        const a = farEastOutline[i];
        const b = farEastOutline[(i + 1) % farEastOutline.length];
        const segMinZ = Math.min(a[1], b[1]) - margin;
        const segMaxZ = Math.max(a[1], b[1]) + margin;
        const bStart = Math.max(0, Math.floor(((segMinZ - farEastAABB.minZ) / zSpan) * FAR_EAST_BUCKET_COUNT));
        const bEnd = Math.min(FAR_EAST_BUCKET_COUNT - 1, Math.floor(((segMaxZ - farEastAABB.minZ) / zSpan) * FAR_EAST_BUCKET_COUNT));
        for (let bk = bStart; bk <= bEnd; bk++) {
            farEastZBuckets[bk].push(i);
        }
    }
}

function distToFarEastShore(x, z) {
    const zSpan = farEastAABB.maxZ - farEastAABB.minZ;
    const bk = Math.max(0, Math.min(FAR_EAST_BUCKET_COUNT - 1, Math.floor(((z - farEastAABB.minZ) / zSpan) * FAR_EAST_BUCKET_COUNT)));
    const bucket = farEastZBuckets[bk];
    if (!bucket || bucket.length === 0) return 8.0;

    let minDistSq = 64.0;
    const len = farEastOutline.length;
    for (let k = 0; k < bucket.length; k++) {
        const i = bucket[k];
        const ax = farEastOutline[i][0], az = farEastOutline[i][1];
        const nxt = farEastOutline[(i + 1) % len];
        const bx = nxt[0], bz = nxt[1];
        const vx = bx - ax, vz = bz - az;
        const wx = x - ax, wz = z - az;
        const c1 = vx * wx + vz * wz;
        let dSq;
        if (c1 <= 0) {
            dSq = wx * wx + wz * wz;
        } else {
            const c2 = vx * vx + vz * vz;
            if (c2 <= c1) {
                const dx = x - bx, dz = z - bz;
                dSq = dx * dx + dz * dz;
            } else {
                const b = c1 / c2;
                const dx = x - (ax + b * vx);
                const dz = z - (az + b * vz);
                dSq = dx * dx + dz * dz;
            }
        }
        if (dSq < minDistSq) minDistSq = dSq;
    }
    return Math.sqrt(minDistSq);
}

function getFarEastElevation(x, z) {
    if (
        x < farEastAABB.minX || x > farEastAABB.maxX ||
        z < farEastAABB.minZ || z > farEastAABB.maxZ
    ) {
        return -2.6;
    }
    const inside = isPointInPolygon(x, z, farEastOutline);
    const dist = distToFarEastShore(x, z);
    if (!inside) {
        const shelfT = Math.min(1.0, dist / 6.5);
        return -2.6 * shelfT * shelfT * (3.0 - 2.0 * shelfT);
    }
    const coastT = Math.min(1.0, dist / 5.5);
    const smoothCoast = coastT * coastT * (3.0 - 2.0 * coastT);

    const lon = x / LON_SCALE + CENTER_LON;
    const lat = -z / LAT_SCALE + CENTER_LAT;

    // Горные хребты Дальнего Востока: Сихотэ-Алинь, Буреинский, Джугджур, Становой
    const sikhoteLon = 134.0 + (lat - 43.5) * 0.85;
    const sikhoteRidge = Math.exp(-Math.pow((lon - sikhoteLon) / 1.35, 2)) *
        Math.exp(-Math.pow((lat - 47.0) / 4.2, 2)) * 2.55;

    const bureyaRidge = Math.exp(-Math.pow((lon - 134.2) / 1.45, 2)) *
        Math.exp(-Math.pow((lat - 51.8) / 2.2, 2)) * 2.35;

    const dzhugdzhurLon = 135.2 + (lat - 55.0) * 1.10;
    const dzhugdzhurRidge = Math.exp(-Math.pow((lon - dzhugdzhurLon) / 1.45, 2)) *
        Math.exp(-Math.pow((lat - 57.2) / 2.6, 2)) * 2.65;

    const stanovoyRidge = Math.exp(-Math.pow((lat - 55.8) / 1.5, 2)) *
        Math.exp(-Math.pow((lon - 127.8) / 3.8, 2)) * 2.15;

    // Равнины: Зейско-Буреинская, Среднеамурская и Приханкайская низменности
    const zeyaPlain = Math.exp(-Math.pow((lon - 128.4) / 2.2, 2)) *
        Math.exp(-Math.pow((lat - 50.8) / 1.6, 2)) * 0.50;
    const middleAmurLowland = Math.exp(-Math.pow((lon - 134.2) / 2.0, 2)) *
        Math.exp(-Math.pow((lat - 48.7) / 1.3, 2)) * 0.50;
    const khankaLowland = Math.exp(-Math.pow((lon - 132.4) / 1.1, 2)) *
        Math.exp(-Math.pow((lat - 44.8) / 1.0, 2)) * 0.56;

    const hills =
        Math.sin(x * 0.08 + z * 0.06) * 0.36 +
        Math.cos(x * 0.16 - z * 0.11) * 0.22;

    const relief = Math.max(
        0.28,
        1.08 - zeyaPlain - middleAmurLowland - khankaLowland +
        sikhoteRidge + bureyaRidge + dzhugdzhurRidge + stanovoyRidge +
        Math.max(0, hills) * 0.85
    );

    return smoothCoast * relief;
}

function getFarEastMeshElevation(x, z) {
    if (!farEastMeshGrid) return getFarEastElevation(x, z);
    const g = farEastMeshGrid;
    const u = (x - g.minX) / g.width;
    const v = (z - g.minZ) / g.depth;
    if (u < 0 || u > 1 || v < 0 || v > 1) return -2.6;
    const fx = u * g.segX;
    const fz = v * g.segZ;
    const c0 = Math.min(g.segX, Math.max(0, Math.floor(fx)));
    const r0 = Math.min(g.segZ, Math.max(0, Math.floor(fz)));
    const c1 = Math.min(g.segX, c0 + 1);
    const r1 = Math.min(g.segZ, r0 + 1);
    const tx = fx - c0;
    const tz = fz - r0;
    const cols = g.segX + 1;
    const h00 = g.heights[r0 * cols + c0];
    const h10 = g.heights[r0 * cols + c1];
    const h01 = g.heights[r1 * cols + c0];
    const h11 = g.heights[r1 * cols + c1];
    const h0 = h00 + (h10 - h00) * tx;
    const h1 = h01 + (h11 - h01) * tx;
    return h0 + (h1 - h0) * tz;
}

function getAnyLandElevation(x, z) {
    const hSakh = getSakhalinElevation(x, z);
    if (hSakh > -0.1) return hSakh;
    const hRaw = getFarEastElevation(x, z);
    if (!farEastMeshGrid) return hRaw;
    return Math.max(hRaw, getFarEastMeshElevation(x, z));
}

function getAnySiteMaxElevation(x, z, radius = 1.55) {
    let maxH = getAnyLandElevation(x, z);
    const samples = 12;
    const rings = [radius * 0.52, radius];
    for (let r = 0; r < rings.length; r++) {
        const rad = rings[r];
        for (let i = 0; i < samples; i++) {
            const angle = (i / samples) * Math.PI * 2;
            const sx = x + Math.cos(angle) * rad;
            const sz = z + Math.sin(angle) * rad;
            const h = getAnyLandElevation(sx, sz);
            if (h > maxH) maxH = h;
        }
    }
    return Math.max(0.38, maxH);
}

function buildFarEastMainland() {
    buildFarEastCoastline();

    const width = farEastAABB.maxX - farEastAABB.minX;
    const depth = farEastAABB.maxZ - farEastAABB.minZ;
    const centerX = (farEastAABB.minX + farEastAABB.maxX) * 0.5;
    const centerZ = (farEastAABB.minZ + farEastAABB.maxZ) * 0.5;

    const segX = 104;
    const segZ = 136;
    const cols = segX + 1;
    const rows = segZ + 1;

    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(centerX, 0, centerZ);

    const posAttr = geo.attributes.position;
    const count = posAttr.count;
    let heights = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        heights[i] = getFarEastElevation(posAttr.getX(i), posAttr.getZ(i));
    }

    let nextHeights = new Float32Array(count);
    for (let pass = 0; pass < 2; pass++) {
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
                    nextHeights[idx] = heights[idx];
                    continue;
                }
                nextHeights[idx] = (
                    heights[idx] * 4 +
                    heights[idx - 1] * 2 + heights[idx + 1] * 2 +
                    heights[idx - cols] * 2 + heights[idx + cols] * 2 +
                    heights[idx - cols - 1] + heights[idx - cols + 1] +
                    heights[idx + cols - 1] + heights[idx + cols + 1]
                ) / 16;
            }
        }
        const swap = heights;
        heights = nextHeights;
        nextHeights = swap;
    }

    s1SummerColors = new Float32Array(count * 3);
    s1WinterColors = new Float32Array(count * 3);
    const activeColors = new Float32Array(count * 3);

    const colShelf = new THREE.Color(0x0b4f6c);
    const colShore = new THREE.Color(0xb8ab7c);
    const colPlain = new THREE.Color(0x366f44);
    const colTaiga = new THREE.Color(0x215035);
    const colRidge = new THREE.Color(0x526478);
    const colPeak = new THREE.Color(0xcbd5e1);

    const colWSh = new THREE.Color(0x0e4766);
    const colWSnow = new THREE.Color(0xdbe9f6);
    const colWHi = new THREE.Color(0xf1f7fd);

    const tSum = new THREE.Color();
    const tWin = new THREE.Color();
    const wMix = isWinterMode ? 1.0 : 0.0;

    for (let i = 0; i < count; i++) {
        const h = heights[i];
        posAttr.setY(i, h);
        if (h < -0.15) {
            tSum.copy(colShelf);
            tWin.copy(colWSh);
        } else if (h < 0.35) {
            const t = Math.max(0, (h + 0.15) / 0.50);
            tSum.lerpColors(colShore, colPlain, t);
            tWin.lerpColors(colWSh, colWSnow, t);
        } else if (h < 1.55) {
            const t = (h - 0.35) / 1.20;
            tSum.lerpColors(colPlain, colTaiga, t);
            tWin.lerpColors(colWSnow, colWHi, t);
        } else if (h < 2.65) {
            const t = (h - 1.55) / 1.10;
            tSum.lerpColors(colTaiga, colRidge, t);
            tWin.copy(colWHi);
        } else {
            const t = Math.min(1, (h - 2.65) / 0.9);
            tSum.lerpColors(colRidge, colPeak, t);
            tWin.copy(colWHi);
        }
        const j = i * 3;
        s1SummerColors[j] = tSum.r;
        s1SummerColors[j + 1] = tSum.g;
        s1SummerColors[j + 2] = tSum.b;

        s1WinterColors[j] = tWin.r;
        s1WinterColors[j + 1] = tWin.g;
        s1WinterColors[j + 2] = tWin.b;

        const inv = 1 - wMix;
        activeColors[j] = tSum.r * inv + tWin.r * wMix;
        activeColors[j + 1] = tSum.g * inv + tWin.g * wMix;
        activeColors[j + 2] = tSum.b * inv + tWin.b * wMix;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(activeColors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.03
    });

    s1MainlandMesh = new THREE.Mesh(geo, mat);
    s1MainlandMesh.receiveShadow = true;
    sakhalin1Group.add(s1MainlandMesh);

    // Сохраняем реальную сглаженную сетку высот материка для точной посадки объектов, мостов и рек
    farEastMeshGrid = {
        minX: farEastAABB.minX,
        minZ: farEastAABB.minZ,
        width,
        depth,
        segX,
        segZ,
        heights
    };

    // Реки Амур, Уссури, Зея, Бурея и озеро Ханка строятся единой сезонной системой в alive-world.js (buildFarEastRiversAndLakes)

    // 5. Шантарские острова (Хабаровский край, Охотское море) — в общей группе s1ShantarGroup для скрытия на вкладке «Сахалин-3»
    window.s1ShantarGroup = new THREE.Group();
    const shantarRockMat = new THREE.MeshStandardMaterial({ color: 0x366f44, roughness: 0.85 });
    const shantarShoreMat = new THREE.MeshStandardMaterial({ color: 0xb8ab7c, roughness: 0.9 });
    [
        { lon: 137.55, lat: 54.92, rx: 3.1, rz: 2.4, h: 0.95 }, // Большой Шантар
        { lon: 137.15, lat: 54.68, rx: 1.5, rz: 1.1, h: 0.65 }, // Феклистова
        { lon: 137.88, lat: 54.52, rx: 1.1, rz: 0.85, h: 0.55 } // Малый Шантар
    ].forEach(isl => {
        const [ix, iz] = lonLatToXZ(isl.lon, isl.lat);
        const shGrp = new THREE.Group();
        shGrp.position.set(ix, 0.05, iz);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(isl.rx, isl.rx * 1.18, 0.22, 12), shantarShoreMat);
        base.scale.set(1, 1, isl.rz / isl.rx);
        base.position.y = 0.08;
        const peak = new THREE.Mesh(new THREE.ConeGeometry(isl.rx * 0.86, isl.h, 9), shantarRockMat);
        peak.scale.set(1, 1, isl.rz / isl.rx);
        peak.position.y = 0.16 + isl.h * 0.45;
        shGrp.add(base, peak);
        window.s1ShantarGroup.add(shGrp);
    });
    sakhalin1Group.add(window.s1ShantarGroup);

    s1CityLightsGroup = new THREE.Group();
    s1CityLightsGroup.visible = nightMix > 0.03;
    s1CityLightsMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: nightMix * 0.95
    });
    const dotGeo = new THREE.BoxGeometry(0.38, 0.22, 0.38);
    FAR_EAST_CITIES_DATA.forEach((c, idx) => {
        if (c.isRegion || c.isTransit || c.isWaterOrIsland || c.isNeighbor) return;
        const [cx, cz] = lonLatToXZ(c.geoLonLat[0], c.geoLonLat[1]);
        const isMajor = c.name === 'Хабаровск' || c.name === 'Владивосток' || c.name === 'Комсомольск-на-Амуре' || c.name === 'Благовещенск' || c.name === 'Уссурийск' || c.name === 'Находка';
        const cnt = isMajor ? 14 : 7;
        const spr = isMajor ? 2.5 : 1.15;
        for (let k = 0; k < cnt; k++) {
            const ang = (k / cnt) * Math.PI * 2 + idx * 0.6;
            const dst = k === 0 ? 0 : spr * (0.38 + ((k * 31) % 10) * 0.062);
            const lx = cx + Math.cos(ang) * dst;
            const lz = cz + Math.sin(ang) * dst;
            const ly = Math.max(0.32, getFarEastElevation(lx, lz)) + 0.26;
            const blk = new THREE.Mesh(dotGeo, s1CityLightsMat);
            blk.position.set(lx, ly, lz);
            s1CityLightsGroup.add(blk);
        }
    });
    sakhalin1Group.add(s1CityLightsGroup);
}

