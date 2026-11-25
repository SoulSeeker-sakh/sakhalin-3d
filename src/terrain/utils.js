'use strict';

// =========================================================================
// [BLOCK:TERRAIN_UTILS]
// 4. РАБОТА С LOCALSTORAGE И ГЕОМЕТРИЧЕСКИЕ УТИЛИТЫ РЕЛЬЕФА
// =========================================================================
function isSafeHttpUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
}

function loadSavedUrls() {
    try {
        const saved = JSON.parse(localStorage.getItem('sakhalin2_custom_urls') || '{}');
        FACILITIES_DATA.forEach(fac => {
            if (isSafeHttpUrl(saved[fac.id])) {
                fac.url = saved[fac.id].trim();
            }
        });
        SAKHALIN1_FACILITIES_DATA.forEach(fac => {
            if (isSafeHttpUrl(saved[fac.id])) {
                fac.url = saved[fac.id].trim();
            }
        });
    } catch (e) {
        console.warn('Не удалось прочитать сохраненные ссылки:', e);
    }
}

function saveCustomUrl(id, url) {
    if (!isSafeHttpUrl(url)) return;
    try {
        const saved = JSON.parse(localStorage.getItem('sakhalin2_custom_urls') || '{}');
        saved[id] = url.trim();
        localStorage.setItem('sakhalin2_custom_urls', JSON.stringify(saved));
    } catch (e) {
        console.warn('Не удалось сохранить ссылку:', e);
    }
}

function isPointInPolygon(x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], zi = poly[i][1];
        const xj = poly[j][0], zj = poly[j][1];
        const intersect = ((zi > z) !== (zj > z)) &&
            (x < (xj - xi) * (z - zi) / ((zj - zi) || 1e-9) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function distanceToShoreline(x, z, poly) {
    const zSpan = ISLAND_AABB.maxZ - ISLAND_AABB.minZ;
    const bk = Math.max(0, Math.min(COAST_BUCKET_COUNT - 1, Math.floor(((z - ISLAND_AABB.minZ) / zSpan) * COAST_BUCKET_COUNT)));
    const bucket = COAST_Z_BUCKETS[bk];

    function scanIndices(indices) {
        let minDistSq = Infinity;
        const len = indices ? indices.length : poly.length;
        for (let k = 0; k < len; k++) {
            const i = indices ? indices[k] : k;
            const ax = poly[i][0];
            const az = poly[i][1];
            const next = poly[(i + 1) % poly.length];
            const bx = next[0];
            const bz = next[1];
            const vx = bx - ax;
            const vz = bz - az;
            const wx = x - ax;
            const wz = z - az;
            const c1 = vx * wx + vz * wz;
            let distSq;
            if (c1 <= 0) {
                distSq = wx * wx + wz * wz;
            } else {
                const c2 = vx * vx + vz * vz;
                if (c2 <= c1) {
                    const dx = x - bx;
                    const dz = z - bz;
                    distSq = dx * dx + dz * dz;
                } else {
                    const b = c1 / c2;
                    const dx = x - (ax + b * vx);
                    const dz = z - (az + b * vz);
                    distSq = dx * dx + dz * dz;
                }
            }
            if (distSq < minDistSq) minDistSq = distSq;
        }
        return minDistSq;
    }

    let minDistSq = (bucket && bucket.length > 0) ? scanIndices(bucket) : Infinity;
    if (minDistSq > 16.0) {
        minDistSq = scanIndices(null);
    }
    return Math.sqrt(minDistSq);
}

function getSakhalinElevation(x, z) {
    if (
        x < ISLAND_AABB.minX || x > ISLAND_AABB.maxX ||
        z < ISLAND_AABB.minZ || z > ISLAND_AABB.maxZ
    ) {
        return -2.4;
    }

    const inside = isPointInPolygon(x, z, SAKHALIN_OUTLINE);
    const dist = distanceToShoreline(x, z, SAKHALIN_OUTLINE);

    if (!inside) {
        const shelfT = Math.min(1.0, dist / 5.2);
        const smoothShelf = shelfT * shelfT * (3.0 - 2.0 * shelfT);
        return -2.4 * smoothShelf;
    }

    const coastalBlend = Math.min(1.0, dist / 3.2);
    const smoothCoast = coastalBlend * coastalBlend * (3.0 - 2.0 * coastalBlend);

    const ridgeNoise =
        Math.sin(x * 0.42 + z * 0.20) * 0.30 +
        Math.cos(x * 0.78 - z * 0.42) * 0.22 +
        Math.sin(x * 1.38 + z * 0.85) * 0.12;

    const valleyFactor = Math.exp(-Math.pow((x - 0.8) / 3.8, 2));

    const eastRange = Math.exp(-Math.pow((x - 7.0) / 4.2, 2)) *
        Math.exp(-Math.pow((z + 8.0) / 36.0, 2)) * 2.35;

    const westRange = Math.exp(-Math.pow((x + 8.8) / 4.0, 2)) *
        Math.exp(-Math.pow((z - 22.0) / 50.0, 2)) * 1.85;

    const northHills = Math.exp(-Math.pow((z + 90.0) / 22.0, 2)) * 1.05;
    const southHills = Math.exp(-Math.pow((x - 3.2) / 5.5, 2)) *
        Math.exp(-Math.pow((z - 86.0) / 24.0, 2)) * 1.12;

    const baseHeight = smoothCoast * (1.26 - valleyFactor * 0.34);
    const mountainHeight = smoothCoast * (eastRange + westRange + northHills + southHills + Math.max(0, ridgeNoise) * 0.85);

    return baseHeight + mountainHeight;
}

function getSiteMaxElevation(x, z, radius = 1.35) {
    let maxH = getSakhalinElevation(x, z);
    const samples = 10;
    for (let i = 0; i < samples; i++) {
        const angle = (i / samples) * Math.PI * 2;
        const sx = x + Math.cos(angle) * radius;
        const sz = z + Math.sin(angle) * radius;
        const h = getSakhalinElevation(sx, sz);
        if (h > maxH) maxH = h;
    }
    return Math.max(0.32, maxH);
}

