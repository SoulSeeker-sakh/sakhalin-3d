'use strict';

// =========================================================================
// [BLOCK:COASTLINE]
// 2. РЕАЛЬНАЯ БЕРЕГОВАЯ ЛИНИЯ ОСТРОВА САХАЛИН (СГЛАЖЕННАЯ + Z-ИНДЕКС)
// =========================================================================
const SAKHALIN_COASTLINE_LONLAT = [
    // Север: полуостров Шмидта
    [142.71, 54.42], [142.90, 54.34], [143.05, 54.15], [143.10, 53.95], [142.96, 53.78],
    // Северо-восточный берег: Оха, заливы Пильтун, Чайво, Ныйский (Ноглики), Лунский
    [143.12, 53.65], [143.18, 53.40], [143.26, 53.10], [143.25, 52.80], [143.22, 52.50],
    [143.19, 52.15], [143.18, 51.80], [143.22, 51.50], [143.34, 51.20], [143.46, 50.85],
    [143.62, 50.50], [143.80, 50.15], [143.96, 49.80], [144.18, 49.45],
    // Полуостров и мыс Терпения
    [144.45, 49.15], [144.65, 48.90], [144.71, 48.65], [144.58, 48.62], [144.42, 48.85],
    [144.18, 49.12], [143.92, 49.26],
    // Залив Терпения
    [143.60, 49.30], [143.28, 49.26], [143.05, 49.20], [142.92, 49.00], [142.84, 48.80],
    [142.76, 48.60], [142.72, 48.32], [142.68, 48.02], [142.76, 47.76], [142.92, 47.52],
    [143.06, 47.28], [143.22, 47.05],
    // Тонино-Анивский полуостров и мыс Анива
    [143.40, 46.84], [143.52, 46.62], [143.54, 46.36], [143.48, 46.15], [143.41, 46.02],
    // Залив Анива: Пригородное -> Корсаков -> Анива -> Крильон
    [143.33, 46.12], [143.32, 46.40], [143.26, 46.60], [143.06, 46.63], [142.82, 46.63],
    [142.64, 46.65], [142.44, 46.70], [142.36, 46.58], [142.32, 46.45], [142.24, 46.28],
    [142.18, 46.15], [142.14, 46.00], [142.08, 45.89],
    // Западное побережье: Невельск -> Холмск -> Шахтёрск -> Александровск-Сахалинский
    [141.98, 45.95], [141.93, 46.18], [141.88, 46.44], [141.85, 46.67], [141.95, 46.88],
    [142.04, 47.04], [142.08, 47.32], [142.12, 47.65], [142.18, 47.98], [142.16, 48.32],
    [142.12, 48.68], [142.08, 48.94], [142.06, 49.15], [142.12, 49.45], [142.16, 49.82],
    [142.14, 50.22], [142.15, 50.60], [142.15, 50.90], [142.10, 51.25], [141.98, 51.60],
    [141.82, 51.92],
    // Пролив Невельского -> Сахалинский залив -> мыс Марии
    [141.64, 52.22], [141.72, 52.48], [141.86, 52.75], [142.00, 53.05], [142.18, 53.35],
    [142.42, 53.56], [142.58, 53.75], [142.50, 53.98], [142.34, 54.16], [142.26, 54.30],
    [142.45, 54.38]
];

let SAKHALIN_OUTLINE = [];
let ISLAND_AABB = { minX: -50, maxX: 50, minZ: -130, maxZ: 130 };
const COAST_BUCKET_COUNT = 64;
let COAST_Z_BUCKETS = [];

function buildSmoothedCoastline() {
    const rawVecs = [];
    for (let i = 0; i < SAKHALIN_COASTLINE_LONLAT.length; i++) {
        const [x, z] = lonLatToXZ(SAKHALIN_COASTLINE_LONLAT[i][0], SAKHALIN_COASTLINE_LONLAT[i][1]);
        if (rawVecs.length === 0 || Math.hypot(x - rawVecs[rawVecs.length - 1].x, z - rawVecs[rawVecs.length - 1].z) > 0.05) {
            rawVecs.push(new THREE.Vector3(x, 0, z));
        }
    }

    const curve = new THREE.CatmullRomCurve3(rawVecs, true, 'centripetal');
    const sampled = curve.getPoints(320);

    SAKHALIN_OUTLINE = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < sampled.length; i++) {
        const px = sampled[i].x;
        const pz = sampled[i].z;
        if (!Number.isFinite(px) || !Number.isFinite(pz)) continue;
        SAKHALIN_OUTLINE.push([px, pz]);
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (pz < minZ) minZ = pz;
        if (pz > maxZ) maxZ = pz;
    }

    const pad = 6.0;
    ISLAND_AABB = {
        minX: minX - pad,
        maxX: maxX + pad,
        minZ: minZ - pad,
        maxZ: maxZ + pad
    };

    COAST_Z_BUCKETS = Array.from({ length: COAST_BUCKET_COUNT }, () => []);
    const zSpan = ISLAND_AABB.maxZ - ISLAND_AABB.minZ;
    const margin = 6.0;

    for (let i = 0; i < SAKHALIN_OUTLINE.length; i++) {
        const a = SAKHALIN_OUTLINE[i];
        const b = SAKHALIN_OUTLINE[(i + 1) % SAKHALIN_OUTLINE.length];
        const segMinZ = Math.min(a[1], b[1]) - margin;
        const segMaxZ = Math.max(a[1], b[1]) + margin;
        const bStart = Math.max(0, Math.floor(((segMinZ - ISLAND_AABB.minZ) / zSpan) * COAST_BUCKET_COUNT));
        const bEnd = Math.min(COAST_BUCKET_COUNT - 1, Math.floor(((segMaxZ - ISLAND_AABB.minZ) / zSpan) * COAST_BUCKET_COUNT));
        for (let bk = bStart; bk <= bEnd; bk++) {
            COAST_Z_BUCKETS[bk].push(i);
        }
    }
}

