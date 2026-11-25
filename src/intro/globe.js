'use strict';

// =========================================================================
// [BLOCK:GLOBE_INTRO]
// 11. ИНТЕРАКТИВНЫЙ 3D-ГЛОБУС (ДЕТАЛИЗИРОВАННАЯ ЗЕМЛЯ + ВСАСЫВАНИЕ В ОСТРОВ)
// =========================================================================
const globeIntro = {
    initialized: false,
    running: false,
    diving: false,
    diveProgress: 0,
    mapRevealed: false,
    scene: null,
    camera: null,
    renderer: null,
    planetGroup: null,
    cloudMesh: null,
    cloudItems: [],
    beaconRings: [],
    starField: null,
    sakhguRingMesh: null,
    sakhguCoreMesh: null,
    emblemElapsed: 0,
    coreAlpha: 0,
    coreTouched: false,
    coreIdleTimer: 99,
    cinematicForceHideCore: false,
    sakhalinLocalPos: null,
    sakhalinWorldPos: null,
    hitbox: null,
    raycaster: null,
    mouse: null,
    rotY: 0,
    rotX: 0.46,
    velY: 0,
    velX: 0,
    targetRotY: 0,
    targetRotX: 0.46,
    snappingToSakhalin: false,
    isDragging: false,
    dragMoved: 0,
    lastPtrX: 0,
    lastPtrY: 0,
    idleTimer: 0,
    camDist: 40,
    baseCamDist: 40,
    lookAtY: 0,
    baseLookAtY: 0,
    clock: null,
    rafId: 0
};

// Совпадает со стандартной UV-развёрткой THREE.SphereGeometry:
// u = (lon + 180) / 360, v = (90 - lat) / 180
function globeLatLonToVec3(latDeg, lonDeg, r) {
    const phi = (90 - latDeg) * Math.PI / 180;
    const theta = (lonDeg + 180) * Math.PI / 180;
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
    );
}

// Точный расчёт дистанции камеры, чтобы вся планета с атмосферой красиво помещалась
// на вертикальных телефонах (без обрезки по бокам) и на широких мониторах ПК
function computeGlobeBaseCamPose(w, h) {
    const aspect = Math.max(0.36, w / Math.max(1, h));
    const vHalfTan = Math.tan(21 * Math.PI / 180);
    const hHalfTan = vHalfTan * aspect;
    // Учитываем внешнее кольцо герба СахГУ (радиус ~14.4), чтобы оно целиком и красиво помещалось на ПК и телефоне
    const distByWidth = 14.8 / (0.86 * hHalfTan);
    const distByHeight = 13.6 / (0.68 * vHalfTan);
    const dist = Math.max(44.0, Math.min(96.0, Math.max(distByWidth, distByHeight)));
    const lookY = aspect < 0.78 ? -3.4 : -0.9;
    return { dist, lookY };
}

// Подробные контуры континентов и островов (особый акцент на Дальний Восток, Сахалин, Курилы и Японию)
const GLOBE_HD_LANDMASSES = [
    // Евразия (подробная линия побережья от Португалии до Чукотки, Индия, ЮВА, Камчатка, Приморье)
    {
        kind: 'land',
        poly: [
            [-9.5, 37.0], [-9.2, 42.8], [-4.5, 43.4], [-1.8, 43.4], [-4.5, 48.2], [1.8, 50.9],
            [5.0, 53.3], [8.5, 54.0], [8.2, 57.0], [10.6, 57.6], [10.0, 54.5], [14.0, 54.0],
            [19.0, 54.6], [21.0, 57.5], [24.5, 59.5], [29.8, 60.0], [22.0, 60.5], [21.2, 63.5],
            [25.0, 65.7], [18.5, 62.5], [16.5, 56.5], [12.5, 55.5], [10.5, 59.8], [5.2, 60.5],
            [10.0, 64.5], [15.5, 68.5], [25.5, 71.1], [31.5, 69.8], [40.5, 67.2], [35.0, 65.5],
            [39.5, 64.5], [44.0, 66.8], [46.0, 68.2], [58.0, 69.5], [68.0, 72.5], [73.0, 72.8],
            [82.0, 73.5], [95.0, 76.5], [104.5, 77.6], [114.0, 73.8], [126.0, 73.2], [136.0, 71.5],
            [148.0, 71.0], [161.0, 69.6], [174.0, 68.8], [179.5, 66.2], [174.0, 62.2], [166.0, 60.0],
            [162.5, 56.5], [160.2, 53.0], [156.7, 50.9], [155.8, 53.5], [157.0, 57.5], [162.0, 60.8],
            [159.0, 61.5], [155.0, 60.2], [150.8, 59.5], [145.0, 59.4], [141.5, 59.0], [138.2, 56.4],
            [135.4, 54.7], [137.5, 54.0], [140.5, 54.0], [141.2, 52.8], [140.7, 51.5], [140.3, 49.0],
            [138.8, 47.0], [136.5, 44.8], [134.8, 43.3], [131.9, 43.1], [130.7, 42.3], [129.2, 40.3],
            [127.6, 39.2], [129.3, 37.2], [129.0, 35.1], [126.4, 34.7], [126.2, 37.5], [125.2, 39.2],
            [123.5, 39.8], [121.6, 38.9], [122.0, 40.8], [119.5, 40.0], [117.8, 38.6], [120.5, 37.6],
            [122.4, 37.0], [119.5, 34.8], [121.8, 31.2], [121.2, 28.5], [118.2, 24.5], [114.2, 22.3],
            [110.2, 20.4], [108.5, 21.5], [106.5, 19.2], [109.2, 13.5], [107.2, 10.4], [105.0, 8.8],
            [103.5, 10.8], [100.5, 13.5], [100.0, 9.5], [103.8, 1.3], [101.2, 3.0], [98.5, 8.5],
            [97.8, 15.8], [94.5, 16.0], [92.2, 21.2], [89.0, 22.0], [85.8, 19.8], [80.2, 13.0],
            [77.5, 8.1], [74.8, 13.0], [72.8, 19.0], [69.0, 22.5], [66.8, 25.0], [61.5, 25.2],
            [56.5, 27.0], [50.0, 29.8], [51.2, 25.8], [56.2, 25.8], [59.8, 22.5], [53.5, 16.5],
            [45.0, 12.8], [43.3, 12.7], [39.0, 21.5], [34.8, 29.5], [32.6, 31.2], [35.5, 33.8],
            [36.0, 36.6], [30.5, 36.4], [26.8, 38.6], [26.2, 40.5], [29.0, 41.2], [28.0, 42.5],
            [31.0, 46.5], [36.5, 45.3], [41.0, 41.5], [35.5, 42.0], [29.5, 41.3], [26.0, 40.8],
            [23.2, 38.0], [22.2, 36.5], [20.0, 39.8], [16.5, 43.2], [13.5, 45.6], [12.5, 44.0],
            [16.0, 41.8], [18.4, 40.2], [15.8, 38.0], [12.2, 41.8], [9.0, 44.4], [5.0, 43.3],
            [3.0, 42.3], [-0.5, 38.0], [-5.4, 36.0]
        ]
    },
    // Африка
    {
        kind: 'land',
        poly: [
            [-6.0, 35.8], [3.0, 36.8], [10.5, 37.2], [11.2, 33.5], [15.0, 32.5], [20.0, 32.8],
            [25.0, 31.6], [32.3, 31.2], [34.5, 27.5], [38.0, 21.0], [43.2, 12.4], [51.3, 11.8],
            [49.0, 6.0], [41.5, -1.5], [39.5, -8.0], [40.5, -15.0], [35.2, -20.0], [32.8, -26.5],
            [28.0, -33.0], [20.0, -34.8], [18.2, -33.8], [15.0, -26.0], [12.0, -16.0], [12.2, -6.0],
            [9.2, 1.0], [9.4, 4.2], [5.0, 4.8], [1.0, 6.2], [-4.0, 5.2], [-8.0, 4.5], [-13.5, 9.2],
            [-17.4, 14.7], [-16.2, 21.0], [-13.2, 27.5], [-9.5, 32.0]
        ]
    },
    // Северная Америка
    {
        kind: 'land',
        poly: [
            [-166.0, 65.5], [-161.0, 70.5], [-156.5, 71.3], [-141.0, 69.8], [-128.0, 70.2],
            [-110.0, 68.5], [-94.0, 68.5], [-88.0, 63.0], [-94.0, 58.5], [-82.0, 52.0],
            [-78.5, 58.0], [-76.0, 62.5], [-66.0, 60.5], [-60.5, 56.0], [-55.5, 52.0],
            [-60.0, 46.5], [-66.5, 44.5], [-70.2, 41.8], [-74.0, 40.5], [-75.5, 35.2],
            [-81.0, 31.0], [-80.2, 25.2], [-82.5, 27.5], [-84.0, 30.0], [-90.0, 29.2],
            [-97.2, 26.0], [-96.5, 19.2], [-91.0, 18.5], [-89.5, 21.5], [-86.8, 21.2],
            [-88.2, 16.0], [-83.5, 15.0], [-83.0, 10.0], [-77.5, 8.2], [-79.5, 8.8],
            [-85.5, 10.5], [-92.5, 14.8], [-98.5, 16.2], [-105.5, 20.5], [-109.5, 25.5],
            [-112.5, 31.0], [-114.5, 31.5], [-110.0, 23.0], [-113.5, 27.0], [-117.2, 32.6],
            [-121.0, 35.5], [-124.2, 40.5], [-124.5, 48.2], [-128.0, 51.5], [-134.0, 57.5],
            [-142.0, 60.0], [-151.0, 60.2], [-156.0, 56.5], [-163.0, 55.0], [-161.0, 58.5],
            [-166.0, 60.5], [-164.0, 63.2]
        ]
    },
    // Южная Америка
    {
        kind: 'land',
        poly: [
            [-77.5, 8.2], [-75.5, 10.8], [-71.5, 12.2], [-66.0, 10.6], [-61.0, 9.5],
            [-52.0, 4.5], [-49.5, 0.0], [-41.0, -2.8], [-34.8, -7.2], [-38.5, -13.5],
            [-39.8, -19.5], [-42.0, -23.0], [-48.5, -26.5], [-53.5, -34.0], [-57.5, -38.5],
            [-65.0, -42.5], [-67.5, -50.5], [-68.0, -54.8], [-73.0, -54.5], [-75.0, -47.5],
            [-73.5, -38.0], [-71.5, -30.0], [-70.5, -18.5], [-76.5, -14.0], [-81.2, -4.8],
            [-79.8, 1.5], [-78.0, 5.5]
        ]
    },
    // Австралия
    {
        kind: 'land',
        poly: [
            [114.0, -22.0], [122.0, -17.5], [129.0, -14.5], [131.5, -12.0], [136.8, -12.4],
            [136.5, -15.5], [141.0, -16.8], [142.5, -10.8], [145.5, -15.5], [149.5, -21.0],
            [153.5, -27.5], [151.0, -34.0], [149.5, -37.5], [144.5, -38.5], [138.0, -35.8],
            [131.0, -31.8], [122.0, -33.8], [115.2, -34.2], [114.2, -27.5]
        ]
    },
    // Гренландия
    {
        kind: 'ice',
        poly: [
            [-44.0, 60.0], [-36.0, 65.5], [-21.0, 70.5], [-17.5, 76.5], [-18.5, 81.5],
            [-34.0, 83.4], [-52.0, 82.0], [-69.0, 77.5], [-56.0, 72.0], [-52.5, 65.0]
        ]
    },
    // Антарктида
    {
        kind: 'ice',
        poly: [
            [-180, -72], [-150, -75], [-120, -73], [-90, -72], [-62, -64], [-55, -67],
            [-30, -73], [0, -70], [35, -69], [70, -68], [105, -66], [140, -67],
            [170, -72], [180, -72], [180, -90], [-180, -90]
        ]
    },
    // о. Сахалин (узнаваемый вытянутый силуэт с заливами Терпения и Анива)
    {
        kind: 'sakhalin',
        poly: [
            [142.7, 54.4], [143.1, 53.9], [143.3, 52.8], [143.2, 51.6], [143.7, 50.3],
            [144.7, 48.7], [143.8, 49.2], [142.8, 48.7], [142.7, 47.9], [143.4, 46.8],
            [143.4, 46.0], [143.0, 46.6], [142.4, 46.6], [142.1, 45.9], [141.9, 46.7],
            [142.1, 48.2], [142.1, 50.5], [141.6, 52.2], [142.2, 53.6], [142.3, 54.3]
        ]
    },
    // Япония: Хоккайдо
    {
        kind: 'land',
        poly: [
            [141.9, 45.5], [143.0, 44.5], [145.3, 44.3], [145.6, 43.4], [143.3, 42.0],
            [141.2, 42.6], [140.1, 41.5], [140.4, 43.3], [141.5, 44.2]
        ]
    },
    // Япония: Хонсю + Кюсю
    {
        kind: 'land',
        poly: [
            [140.4, 41.3], [141.5, 41.4], [142.0, 39.6], [141.0, 37.8], [140.8, 35.6],
            [139.0, 34.8], [135.8, 33.5], [131.0, 33.8], [130.5, 31.2], [129.6, 32.8],
            [131.2, 34.4], [135.5, 35.7], [137.0, 37.4], [139.2, 38.2], [140.0, 40.6]
        ]
    },
    // Курильская дуга (основные острова)
    { kind: 'land', poly: [[145.4, 43.7], [146.5, 44.5], [146.1, 44.6], [145.2, 43.9]] },
    { kind: 'land', poly: [[146.9, 44.5], [148.9, 45.4], [148.6, 45.6], [146.8, 44.8]] },
    { kind: 'land', poly: [[149.4, 45.6], [150.5, 46.2], [150.2, 46.4], [149.2, 45.8]] },
    { kind: 'land', poly: [[155.2, 50.0], [156.3, 50.8], [155.9, 50.9], [154.9, 50.2]] },
    // Крупные острова мира для узнаваемого глобуса
    { kind: 'land', poly: [[-6.0, 50.0], [1.8, 51.2], [1.5, 53.0], [-1.5, 55.5], [-3.0, 58.6], [-6.2, 57.5], [-4.8, 53.5]] }, // Великобритания
    { kind: 'land', poly: [[-24.0, 64.0], [-14.0, 64.5], [-15.0, 66.4], [-23.5, 66.0]] }, // Исландия
    { kind: 'land', poly: [[49.2, -12.0], [50.2, -16.0], [47.0, -25.2], [43.8, -24.5], [44.2, -19.0], [47.5, -14.5]] }, // Мадагаскар
    { kind: 'land', poly: [[120.2, 22.0], [121.9, 25.2], [121.0, 25.1], [120.0, 23.0]] }, // Тайвань
    { kind: 'land', poly: [[120.0, 14.0], [122.5, 18.5], [123.5, 13.5], [126.0, 7.0], [122.0, 6.8], [120.5, 11.5]] }, // Филиппины
    { kind: 'land', poly: [[109.0, 1.5], [116.5, 6.8], [118.8, 1.0], [116.0, -3.8], [111.0, -3.2]] }, // Борнео
    { kind: 'land', poly: [[95.3, 5.5], [105.5, -5.8], [103.8, -5.9], [95.0, 3.8]] }, // Суматра
    { kind: 'land', poly: [[105.5, -6.2], [114.5, -8.2], [114.0, -8.8], [105.8, -7.0]] }, // Ява
    { kind: 'land', poly: [[131.0, -1.5], [141.0, -2.5], [150.0, -10.2], [143.0, -8.5], [135.0, -4.5]] }, // Новая Гвинея
    { kind: 'land', poly: [[172.8, -34.5], [178.5, -37.8], [175.0, -41.5], [173.2, -39.5]] }, // Н. Зеландия (Сев.)
    { kind: 'land', poly: [[173.8, -41.2], [170.5, -45.8], [166.8, -46.2], [170.2, -42.2]] }, // Н. Зеландия (Юж.)
    { kind: 'land', poly: [[-84.5, 21.8], [-74.2, 20.2], [-75.5, 19.8], [-84.0, 21.0]] }, // Куба
    { kind: 'land', poly: [[79.8, 9.6], [81.8, 7.4], [80.4, 5.9], [79.7, 7.6]] }, // Шри-Ланка
    { kind: 'ice',  poly: [[52.0, 71.0], [68.0, 76.8], [64.0, 77.0], [51.0, 72.8]] }  // Новая Земля
];

// Генерация чётких процедурных текстур Земли (цвет 2048x1024 + рельеф и шероховатость 1024x512)
function buildHdEarthTextures() {
    const W = 2048;
    const H = 1024;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = W;
    colorCanvas.height = H;
    const ctx = colorCanvas.getContext('2d');

    function lonToX(lon, width) { return ((lon + 180) / 360) * width; }
    function latToY(lat, height) { return ((90 - lat) / 180) * height; }

    function traceAllPolys(targetCtx, width, height, filterFn) {
        targetCtx.beginPath();
        for (let i = 0; i < GLOBE_HD_LANDMASSES.length; i++) {
            const lm = GLOBE_HD_LANDMASSES[i];
            if (filterFn && !filterFn(lm)) continue;
            const poly = lm.poly;
            for (let j = 0; j < poly.length; j++) {
                const px = lonToX(poly[j][0], width);
                const py = latToY(poly[j][1], height);
                if (j === 0) targetCtx.moveTo(px, py);
                else targetCtx.lineTo(px, py);
            }
            targetCtx.closePath();
        }
    }

    // 1. Глубокий гладкий океан
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
    oceanGrad.addColorStop(0.00, '#0c365c');
    oceanGrad.addColorStop(0.18, '#082d52');
    oceanGrad.addColorStop(0.50, '#0a3a66');
    oceanGrad.addColorStop(0.82, '#072b4d');
    oceanGrad.addColorStop(1.00, '#0e3c63');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, W, H);

    // Едва заметная тактическая градусная сетка океана
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.065)';
    ctx.lineWidth = 1.0;
    for (let lon = -150; lon <= 180; lon += 30) {
        const x = lonToX(lon, W);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
        const y = latToY(lat, H);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // 2. Мягкий бирюзовый мелководный шельф вокруг материков (многослойный плавный градиент без ступенек)
    ctx.save();
    traceAllPolys(ctx, W, H, null);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(18, 108, 146, 0.22)';
    ctx.lineWidth = 28;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(30, 142, 178, 0.30)';
    ctx.lineWidth = 15;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(52, 180, 208, 0.36)';
    ctx.lineWidth = 6.5;
    ctx.stroke();
    ctx.restore();

    // 3. Чистая окраска суши с плавными биомами (без резких точечных пятен)
    ctx.save();
    traceAllPolys(ctx, W, H, lm => lm.kind === 'land');
    ctx.clip();

    const landGrad = ctx.createLinearGradient(0, 0, 0, H);
    landGrad.addColorStop(0.00, '#dbe8f2');
    landGrad.addColorStop(0.12, '#628372');
    landGrad.addColorStop(0.22, '#245938');
    landGrad.addColorStop(0.32, '#347344');
    landGrad.addColorStop(0.42, '#5c844a');
    landGrad.addColorStop(0.50, '#2a6b3b');
    landGrad.addColorStop(0.62, '#5e8249');
    landGrad.addColorStop(0.76, '#396f43');
    landGrad.addColorStop(1.00, '#dce8f2');
    ctx.fillStyle = landGrad;
    ctx.fillRect(0, 0, W, H);

    // Плавные природные пояса (пустыни, нагорья, тайга)
    const biomeBlobs = [
        { lon: 14,   lat: 23,  rx: 235, ry: 78,  col: 'rgba(196, 170, 118, 0.78)' },
        { lon: 46,   lat: 24,  rx: 102, ry: 58,  col: 'rgba(198, 174, 122, 0.74)' },
        { lon: 65,   lat: 41,  rx: 132, ry: 52,  col: 'rgba(164, 154, 108, 0.56)' },
        { lon: 102,  lat: 42,  rx: 118, ry: 46,  col: 'rgba(166, 152, 112, 0.52)' },
        { lon: 86,   lat: 32,  rx: 108, ry: 42,  col: 'rgba(148, 158, 170, 0.65)' },
        { lon: 133,  lat: -25, rx: 126, ry: 60,  col: 'rgba(186, 146, 98, 0.68)'  },
        { lon: -112, lat: 36,  rx: 82,  ry: 60,  col: 'rgba(160, 144, 106, 0.48)' },
        { lon: -68,  lat: -18, rx: 38,  ry: 138, col: 'rgba(132, 142, 148, 0.52)' },
        { lon: 136,  lat: 50,  rx: 68,  ry: 58,  col: 'rgba(26, 86, 52, 0.56)'    },
        { lon: 92,   lat: 60,  rx: 190, ry: 65,  col: 'rgba(32, 82, 54, 0.34)'    }
    ];
    biomeBlobs.forEach(b => {
        const bx = lonToX(b.lon, W);
        const by = latToY(b.lat, H);
        ctx.save();
        ctx.translate(bx, by);
        ctx.scale(1, b.ry / b.rx);
        const g = ctx.createRadialGradient(0, 0, b.rx * 0.08, 0, 0, b.rx);
        g.addColorStop(0, b.col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, b.rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
    ctx.restore();

    // 4. Ледяные шапки
    ctx.save();
    traceAllPolys(ctx, W, H, lm => lm.kind === 'ice');
    ctx.fillStyle = '#e5f0fa';
    ctx.fill();
    ctx.restore();

    // 5. Тонкая сглаженная береговая кромка
    ctx.save();
    traceAllPolys(ctx, W, H, lm => lm.kind !== 'sakhalin');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(218, 210, 174, 0.34)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();

    // 6. Выделенный изумрудно-золотистый Сахалин
    ctx.save();
    traceAllPolys(ctx, W, H, lm => lm.kind === 'sakhalin');
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#34d399';
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();

    // 7. Сглаженная карта высот (2048x1024) с мягким градиентным берегом — НОЛЬ пиксельных лесенок!
    const MW = 2048;
    const MH = 1024;
    const heightCanvas = document.createElement('canvas');
    heightCanvas.width = MW;
    heightCanvas.height = MH;
    const hCtx = heightCanvas.getContext('2d');
    hCtx.fillStyle = '#000000';
    hCtx.fillRect(0, 0, MW, MH);

    hCtx.save();
    hCtx.lineJoin = 'round';
    hCtx.lineCap = 'round';
    // Многослойное сглаживание кромки (работает на всех устройствах) + аппаратный blur
    try { hCtx.filter = 'blur(5px)'; } catch (_) {}
    traceAllPolys(hCtx, MW, MH, null);
    hCtx.strokeStyle = 'rgba(110, 110, 110, 0.35)';
    hCtx.lineWidth = 14;
    hCtx.stroke();
    hCtx.strokeStyle = 'rgba(130, 130, 130, 0.55)';
    hCtx.lineWidth = 7;
    hCtx.stroke();
    hCtx.fillStyle = '#828282';
    hCtx.fill();
    try { hCtx.filter = 'none'; } catch (_) {}
    hCtx.restore();

    // Плавные горные хребты
    hCtx.save();
    traceAllPolys(hCtx, MW, MH, null);
    hCtx.clip();
    const mountainPeaks = [
        { lon: 86,    lat: 31,  r: 96 },
        { lon: 137,   lat: 48,  r: 48 },
        { lon: 142.9, lat: 50.3,r: 30 },
        { lon: -115,  lat: 46,  r: 84 },
        { lon: -70,   lat: -20, r: 66 },
        { lon: 10,    lat: 46,  r: 42 },
        { lon: 60,    lat: 60,  r: 52 }
    ];
    mountainPeaks.forEach(mp => {
        const mx = lonToX(mp.lon, MW);
        const my = latToY(mp.lat, MH);
        const mg = hCtx.createRadialGradient(mx, my, 4, mx, my, mp.r);
        mg.addColorStop(0, 'rgba(255,255,255,0.85)');
        mg.addColorStop(0.55, 'rgba(255,255,255,0.32)');
        mg.addColorStop(1, 'rgba(255,255,255,0)');
        hCtx.fillStyle = mg;
        hCtx.beginPath();
        hCtx.arc(mx, my, mp.r, 0, Math.PI * 2);
        hCtx.fill();
    });
    hCtx.restore();

    // Сглаженная карта шероховатости (2048x1024): глянцевый океан плавно переходит в матовую сушу
    const roughCanvas = document.createElement('canvas');
    roughCanvas.width = MW;
    roughCanvas.height = MH;
    const rCtx = roughCanvas.getContext('2d');
    rCtx.fillStyle = '#525252';
    rCtx.fillRect(0, 0, MW, MH);
    rCtx.save();
    try { rCtx.filter = 'blur(2.5px)'; } catch (_) {}
    traceAllPolys(rCtx, MW, MH, null);
    rCtx.fillStyle = '#e2e2e2';
    rCtx.fill();
    try { rCtx.filter = 'none'; } catch (_) {}
    rCtx.restore();

    const maxAniso = (globeIntro && globeIntro.renderer && globeIntro.renderer.capabilities)
        ? Math.min(16, globeIntro.renderer.capabilities.getMaxAnisotropy())
        : 8;

    const colorTex = new THREE.CanvasTexture(colorCanvas);
    colorTex.anisotropy = maxAniso;
    colorTex.minFilter = THREE.LinearMipmapLinearFilter;
    colorTex.magFilter = THREE.LinearFilter;

    const bumpTex = new THREE.CanvasTexture(heightCanvas);
    bumpTex.anisotropy = maxAniso;
    bumpTex.minFilter = THREE.LinearMipmapLinearFilter;
    bumpTex.magFilter = THREE.LinearFilter;

    const roughTex = new THREE.CanvasTexture(roughCanvas);
    roughTex.anisotropy = maxAniso;
    roughTex.minFilter = THREE.LinearMipmapLinearFilter;
    roughTex.magFilter = THREE.LinearFilter;

    const heightPixels = hCtx.getImageData(0, 0, MW, MH).data;
    return { colorTex, bumpTex, roughTex, heightPixels, MW, MH };
}

function computeTargetAnglesForSakhalin() {
    const s = globeLatLonToVec3(50.35, 142.85, 1.0).normalize();
    const rotY = -Math.atan2(s.x, s.z);
    const horiz = Math.hypot(s.x, s.z);
    const rotX = Math.atan2(s.y, horiz) * 0.86;
    return { rotY, rotX };
}

function initGlobeIntro() {
    if (globeIntro.initialized) return;
    globeIntro.initialized = true;

    const wrap = document.getElementById('globe-canvas-wrap');
    if (!wrap || typeof THREE === 'undefined') return;

    document.body.classList.add('intro-active-hud-hidden');

    globeIntro.clock = new THREE.Clock();
    globeIntro.scene = new THREE.Scene();
    globeIntro.raycaster = new THREE.Raycaster();
    globeIntro.mouse = new THREE.Vector2();
    globeIntro.sakhalinWorldPos = new THREE.Vector3();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const pose = computeGlobeBaseCamPose(w, h);
    globeIntro.baseCamDist = pose.dist;
    globeIntro.camDist = pose.dist;
    globeIntro.baseLookAtY = pose.lookY;
    globeIntro.lookAtY = pose.lookY;

    globeIntro.camera = new THREE.PerspectiveCamera(42, w / h, 0.2, 500);
    globeIntro.camera.position.set(0, 0, globeIntro.camDist);

    globeIntro.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    globeIntro.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileViewport() ? 1.75 : 2));
    globeIntro.renderer.setSize(w, h);
    globeIntro.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    globeIntro.renderer.toneMappingExposure = 1.12;
    wrap.appendChild(globeIntro.renderer.domElement);

    // Освещение космоса (тёплое солнце + холодная атмосферная подсветка)
    globeIntro.scene.add(new THREE.HemisphereLight(0xdbeafe, 0x0b172a, 0.92));
    const sun = new THREE.DirectionalLight(0xfffbeb, 1.55);
    sun.position.set(28, 18, 32);
    globeIntro.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.62);
    rim.position.set(-24, -12, -20);
    globeIntro.scene.add(rim);

    // Звёздное небо
    const starCount = 650;
    const starPos = new Float32Array(starCount * 3);
    let sSeed = 51923;
    function sRand() {
        sSeed = (sSeed * 1664525 + 1013904223) >>> 0;
        return sSeed / 4294967296;
    }
    for (let i = 0; i < starCount; i++) {
        const r = 115 + sRand() * 140;
        const u = sRand() * 2 - 1;
        const a = sRand() * Math.PI * 2;
        const sq = Math.sqrt(Math.max(0, 1 - u * u));
        starPos[i * 3] = r * sq * Math.cos(a);
        starPos[i * 3 + 1] = r * u;
        starPos[i * 3 + 2] = r * sq * Math.sin(a);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.9, transparent: true, opacity: 0.85 });
    globeIntro.starField = new THREE.Points(starGeo, starMat);
    globeIntro.scene.add(globeIntro.starField);

    // Группа планеты
    globeIntro.planetGroup = new THREE.Group();
    globeIntro.scene.add(globeIntro.planetGroup);

    // Гладкая детализированная 3D-сфера Земли (128x84) с билинейным сглаживанием рельефа (без пикселей)
    const EARTH_R = 10.0;
    const texBundle = buildHdEarthTextures();
    const earthGeo = new THREE.SphereGeometry(EARTH_R, 128, 84);

    const posAttr = earthGeo.attributes.position;
    const uvAttr = earthGeo.attributes.uv;
    const tmpV = new THREE.Vector3();
    const hData = texBundle.heightPixels;
    const mw = texBundle.MW;
    const mh = texBundle.MH;

    function sampleHeightBilinear(u, v) {
        const fx = Math.max(0, Math.min(mw - 1.001, u * (mw - 1)));
        const fy = Math.max(0, Math.min(mh - 1.001, v * (mh - 1)));
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(mw - 1, x0 + 1);
        const y1 = Math.min(mh - 1, y0 + 1);
        const tx = fx - x0;
        const ty = fy - y0;
        const h00 = hData[(y0 * mw + x0) * 4];
        const h10 = hData[(y0 * mw + x1) * 4];
        const h01 = hData[(y1 * mw + x0) * 4];
        const h11 = hData[(y1 * mw + x1) * 4];
        const top = h00 + (h10 - h00) * tx;
        const bot = h01 + (h11 - h01) * tx;
        return (top + (bot - top) * ty) / 255;
    }

    for (let i = 0; i < posAttr.count; i++) {
        const u = uvAttr.getX(i);
        const v = 1.0 - uvAttr.getY(i);
        const hVal = sampleHeightBilinear(u, v);
        if (hVal > 0.004) {
            tmpV.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
            tmpV.normalize().multiplyScalar(EARTH_R + hVal * 0.20);
            posAttr.setXYZ(i, tmpV.x, tmpV.y, tmpV.z);
        }
    }
    earthGeo.computeVertexNormals();

    const earthMat = new THREE.MeshStandardMaterial({
        map: texBundle.colorTex,
        bumpMap: texBundle.bumpTex,
        bumpScale: 0.065,
        roughnessMap: texBundle.roughTex,
        roughness: 0.90,
        metalness: 0.08
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    globeIntro.planetGroup.add(earthMesh);

    // Тонкое внешнее сияние атмосферы (Френель)
    const atmoGeo = new THREE.SphereGeometry(EARTH_R * 1.11, 48, 36);
    const atmoMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: 'varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec3 vNormal; void main() { float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.9); gl_FragColor = vec4(0.26, 0.72, 1.0, 1.0) * intensity * 0.88; }'
    });
    globeIntro.planetGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    // Лёгкие стилизованные орбитальные облачка (аккуратные кластеры, не мешающие обзору Сахалина)
    const cGeo = new THREE.IcosahedronGeometry(0.32, 1);
    const cMat = new THREE.MeshStandardMaterial({
        color: 0xf1f7fe,
        roughness: 0.92,
        metalness: 0.0,
        transparent: true,
        opacity: 0.72
    });
    globeIntro.cloudItems = [];
    for (let i = 0; i < 46; i++) {
        const cLat = (sRand() - 0.5) * 145;
        const cLon = (sRand() - 0.5) * 360;
        if (Math.abs(cLat - 50.3) < 12 && Math.abs(cLon - 142.8) < 16) continue;
        globeIntro.cloudItems.push({
            lat: cLat,
            lon: cLon,
            r: EARTH_R + 0.72 + sRand() * 0.28,
            sx: 0.9 + sRand() * 1.1,
            sy: 0.22 + sRand() * 0.14,
            sz: 0.65 + sRand() * 0.75,
            speed: 1.1 + sRand() * 1.4
        });
    }
    globeIntro.cloudMesh = new THREE.InstancedMesh(cGeo, cMat, globeIntro.cloudItems.length);
    globeIntro.planetGroup.add(globeIntro.cloudMesh);

    // Маячок прямо на о. Сахалин (золотистый 3D-кристалл и пульсирующий радар)
    globeIntro.sakhalinLocalPos = globeLatLonToVec3(50.35, 142.85, EARTH_R + 0.26);
    const normalDir = globeIntro.sakhalinLocalPos.clone().normalize();

    const pinGroup = new THREE.Group();
    pinGroup.position.copy(globeIntro.sakhalinLocalPos);
    pinGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalDir);
    globeIntro.planetGroup.add(pinGroup);

    const pinCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.35 })
    );
    pinCrystal.position.y = 0.62;
    pinGroup.add(pinCrystal);
    globeIntro.pinCrystal = pinCrystal;

    const pinStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.05, 0.45, 8),
        new THREE.MeshBasicMaterial({ color: 0xfde68a })
    );
    pinStem.position.y = 0.24;
    pinGroup.add(pinStem);

    globeIntro.beaconRings = [];
    for (let k = 0; k < 2; k++) {
        const rMesh = new THREE.Mesh(
            new THREE.RingGeometry(0.32, 0.44, 28),
            new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
        );
        rMesh.rotation.x = -Math.PI / 2;
        rMesh.position.y = 0.08;
        pinGroup.add(rMesh);
        globeIntro.beaconRings.push({ mesh: rMesh, phase: k * Math.PI });
    }

    globeIntro.hitbox = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 12, 12),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    globeIntro.hitbox.position.y = 0.35;
    pinGroup.add(globeIntro.hitbox);

    // =========================================================================
    // ЭМБЛЕМА СахГУ НАД ПЛАНЕТОЙ (два независимых слоя:
    //   1. Внешнее круглое кольцо «САХАЛИНСКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ • СахГУ»
    //      — НЕ вращается, стационарно обрамляет вращающуюся 3D-Землю.
    //   2. Центральный знак (книга, остров, 1949/1954/1998) — на пару секунд на переднем
    //      плане, затем плавно углубляется в планету и растворяется!)
    // =========================================================================
    globeIntro.emblemElapsed = 0;
    if (typeof window.SAKHGU_RING_DATA_URI === 'string' && typeof window.SAKHGU_CORE_DATA_URI === 'string') {
        const texLoader = new THREE.TextureLoader();
        const maxAnisoEmblem = (globeIntro.renderer && globeIntro.renderer.capabilities)
            ? Math.min(16, globeIntro.renderer.capabilities.getMaxAnisotropy())
            : 8;

        const ringTex = texLoader.load(window.SAKHGU_RING_DATA_URI);
        ringTex.anisotropy = maxAnisoEmblem;
        ringTex.minFilter = THREE.LinearMipmapLinearFilter;
        ringTex.magFilter = THREE.LinearFilter;

        // Внутренний белый круг текстуры (191/280) точно обнимает Землю (R = 10.85)
        const ringPlaneSize = 31.82;
        const ringMat = new THREE.MeshBasicMaterial({
            map: ringTex,
            transparent: true,
            opacity: 0.0,
            depthTest: false,
            depthWrite: false
        });
        const ringMesh = new THREE.Mesh(new THREE.PlaneGeometry(ringPlaneSize, ringPlaneSize), ringMat);
        ringMesh.position.set(0, 0, 0);
        ringMesh.renderOrder = 20;
        globeIntro.scene.add(ringMesh);
        globeIntro.sakhguRingMesh = ringMesh;

        const coreTex = texLoader.load(window.SAKHGU_CORE_DATA_URI);
        coreTex.anisotropy = maxAnisoEmblem;
        coreTex.minFilter = THREE.LinearMipmapLinearFilter;
        coreTex.magFilter = THREE.LinearFilter;

        const coreBaseSize = 22.84;
        const coreMat = new THREE.MeshBasicMaterial({
            map: coreTex,
            transparent: true,
            opacity: 0.0,
            depthTest: false,
            depthWrite: false
        });
        const coreMesh = new THREE.Mesh(new THREE.PlaneGeometry(coreBaseSize, coreBaseSize), coreMat);
        coreMesh.position.set(0, 0, 12.6);
        coreMesh.renderOrder = 25;
        globeIntro.scene.add(coreMesh);
        globeIntro.sakhguCoreMesh = coreMesh;
    }

    // Стартовый ракурс: Дальний Восток и Сахалин красиво видны на лицевой стороне
    const initialAngles = computeTargetAnglesForSakhalin();
    globeIntro.rotY = initialAngles.rotY - 0.24;
    globeIntro.rotX = initialAngles.rotX;
    globeIntro.targetRotY = initialAngles.rotY;
    globeIntro.targetRotX = initialAngles.rotX;

    // Свободное вращение планеты пальцем и мышкой (+ плавный зум двумя пальцами без резкого рывка!)
    const dom = globeIntro.renderer.domElement;
    const activePointers = new Map();
    let lastPinchDist = null;
    let wasPinching = false;

    function markGlobeTouched() {
        globeIntro.coreTouched = true;
        globeIntro.coreIdleTimer = 0;
    }

    function getPinchDistance() {
        if (activePointers.size < 2) return null;
        const pts = Array.from(activePointers.values());
        return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
    }

    dom.addEventListener('pointerdown', e => {
        if (globeIntro.diving) return;
        markGlobeTouched();
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        globeIntro.snappingToSakhalin = false;
        globeIntro.velX = 0;
        globeIntro.velY = 0;
        globeIntro.idleTimer = 0;

        if (activePointers.size === 1) {
            globeIntro.isDragging = true;
            globeIntro.dragMoved = 0;
            globeIntro.lastPtrX = e.clientX;
            globeIntro.lastPtrY = e.clientY;
            lastPinchDist = null;
            wasPinching = false;
        } else {
            // При касании вторым пальцем переходим в плавный щипковый зум и гасим вращение
            globeIntro.isDragging = false;
            globeIntro.dragMoved = 999;
            wasPinching = true;
            lastPinchDist = getPinchDistance();
        }
        try { dom.setPointerCapture(e.pointerId); } catch (_) {}
    });

    dom.addEventListener('pointermove', e => {
        if (globeIntro.diving) return;
        if (activePointers.has(e.pointerId)) {
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            markGlobeTouched();
            globeIntro.idleTimer = 0;

            if (activePointers.size >= 2) {
                const dist = getPinchDistance();
                if (dist !== null && lastPinchDist !== null) {
                    const delta = lastPinchDist - dist;
                    const minD = globeIntro.baseCamDist * 0.58;
                    const maxD = globeIntro.baseCamDist * 1.32;
                    globeIntro.camDist = Math.max(minD, Math.min(maxD, globeIntro.camDist + delta * 0.14));
                }
                lastPinchDist = dist;
                globeIntro.velX = 0;
                globeIntro.velY = 0;
                return;
            }

            if (globeIntro.isDragging) {
                const dx = e.clientX - globeIntro.lastPtrX;
                const dy = e.clientY - globeIntro.lastPtrY;
                globeIntro.lastPtrX = e.clientX;
                globeIntro.lastPtrY = e.clientY;
                // Защита от редких скачков координат на тачскринах
                if (Math.hypot(dx, dy) > 120) return;
                globeIntro.dragMoved += Math.hypot(dx, dy);

                globeIntro.rotY += dx * 0.0062;
                globeIntro.rotX = Math.max(-1.25, Math.min(1.25, globeIntro.rotX + dy * 0.0056));
                globeIntro.velY = Math.max(-0.14, Math.min(0.14, dx * 0.0052));
                globeIntro.velX = Math.max(-0.12, Math.min(0.12, dy * 0.0046));
            }
        } else if (e.pointerType !== 'touch') {
            const rect = dom.getBoundingClientRect();
            globeIntro.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            globeIntro.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            globeIntro.raycaster.setFromCamera(globeIntro.mouse, globeIntro.camera);
            const hits = globeIntro.raycaster.intersectObject(globeIntro.hitbox, false);
            wrap.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
        }
    });

    function endGlobeDrag(e) {
        if (!activePointers.has(e.pointerId) && !globeIntro.isDragging) return;
        activePointers.delete(e.pointerId);
        try { dom.releasePointerCapture(e.pointerId); } catch (_) {}

        if (activePointers.size === 1) {
            // Один палец остался на экране после зума — мягко подхватываем его без рывка
            const rem = activePointers.values().next().value;
            globeIntro.lastPtrX = rem.x;
            globeIntro.lastPtrY = rem.y;
            globeIntro.velX = 0;
            globeIntro.velY = 0;
            globeIntro.isDragging = true;
            lastPinchDist = null;
            return;
        }
        if (activePointers.size >= 2) {
            lastPinchDist = getPinchDistance();
            return;
        }

        const wasTap = !wasPinching && globeIntro.isDragging && globeIntro.dragMoved < 10 && !globeIntro.diving;
        globeIntro.isDragging = false;
        lastPinchDist = null;
        wasPinching = false;

        if (wasTap) {
            const rect = dom.getBoundingClientRect();
            globeIntro.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            globeIntro.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            globeIntro.raycaster.setFromCamera(globeIntro.mouse, globeIntro.camera);
            const hits = globeIntro.raycaster.intersectObject(globeIntro.hitbox, false);
            if (hits.length > 0) {
                enterMapFromGlobe();
            }
        }
    }
    dom.addEventListener('pointerup', endGlobeDrag);
    dom.addEventListener('pointercancel', endGlobeDrag);

    dom.addEventListener('wheel', e => {
        if (globeIntro.diving) return;
        markGlobeTouched();
        const minD = globeIntro.baseCamDist * 0.58;
        const maxD = globeIntro.baseCamDist * 1.32;
        globeIntro.camDist = Math.max(minD, Math.min(maxD, globeIntro.camDist + e.deltaY * 0.02));
    }, { passive: true });

    // Кнопки интерфейса стартового экрана
    const pinBtn = document.getElementById('btn-globe-enter-pin');
    const enterBtn = document.getElementById('btn-globe-enter-main');
    const focusBtn = document.getElementById('btn-globe-focus-sakhalin');
    if (pinBtn) pinBtn.addEventListener('click', e => { e.stopPropagation(); enterMapFromGlobe(); });
    if (enterBtn) enterBtn.addEventListener('click', () => enterMapFromGlobe());
    if (focusBtn) focusBtn.addEventListener('click', () => {
        markGlobeTouched();
        const a = computeTargetAnglesForSakhalin();
        globeIntro.targetRotY = a.rotY;
        globeIntro.targetRotX = a.rotX;
        globeIntro.snappingToSakhalin = true;
        globeIntro.velX = 0;
        globeIntro.velY = 0;
    });

    document.querySelectorAll('.globe-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => applyPlatformMode(btn.dataset.platform, true));
    });

    document.querySelectorAll('.globe-proj-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const p = btn.dataset.startProj;
            introStartProject = (p === 'sakhalin1' || p === 'sakhalin3' || p === 'shv') ? p : 'sakhalin2';
            const clsMap = { sakhalin2: 'active-s2', sakhalin1: 'active-s1', sakhalin3: 'active-s3', shv: 'active-shv' };
            document.querySelectorAll('.globe-proj-btn').forEach(b => {
                const isSel = b.dataset.startProj === introStartProject;
                b.classList.remove('active-s2', 'active-s1', 'active-s3', 'active-shv', 'text-slate-300', 'bg-slate-900/80');
                if (isSel) {
                    b.classList.add(clsMap[introStartProject] || 'active-s2');
                } else {
                    b.classList.add('text-slate-300', 'bg-slate-900/80');
                }
            });
        });
    });

    const openGlobeBtn = document.getElementById('btn-open-globe');
    if (openGlobeBtn) {
        openGlobeBtn.addEventListener('click', () => openGlobeIntro());
    }

    window.addEventListener('resize', () => {
        if (!globeIntro.renderer || !globeIntro.camera) return;
        const nw = window.innerWidth;
        const nh = window.innerHeight;
        const newPose = computeGlobeBaseCamPose(nw, nh);
        globeIntro.baseCamDist = newPose.dist;
        globeIntro.baseLookAtY = newPose.lookY;
        if (!globeIntro.diving) {
            globeIntro.camDist = newPose.dist;
            globeIntro.lookAtY = newPose.lookY;
        }
        globeIntro.camera.aspect = nw / nh;
        globeIntro.camera.updateProjectionMatrix();
        globeIntro.renderer.setSize(nw, nh);
    });

    applyPlatformMode(platformModePreference, true);
    startGlobeLoop();
}

function startGlobeLoop() {
    if (globeIntro.running) return;
    globeIntro.running = true;
    if (globeIntro.clock) globeIntro.clock.getDelta();
    animateGlobeIntro();
}

function stopGlobeLoop() {
    globeIntro.running = false;
    if (globeIntro.rafId) {
        cancelAnimationFrame(globeIntro.rafId);
        globeIntro.rafId = 0;
    }
}

// =========================================================================
function updateWarpVeilTheme() {
    const veil = document.getElementById('globe-warp-veil');
    if (!veil) return;
    if (isNightMode) {
        veil.style.background = 'radial-gradient(circle at 50% 48%, rgba(27, 45, 71, 0.96) 0%, rgba(19, 32, 54, 0.98) 58%, rgba(10, 19, 34, 1.0) 100%)';
    } else if (isWinterMode) {
        veil.style.background = 'radial-gradient(circle at 50% 48%, rgba(92, 122, 150, 0.95) 0%, rgba(76, 106, 134, 0.97) 58%, rgba(58, 84, 110, 1.0) 100%)';
    } else {
        veil.style.background = 'radial-gradient(circle at 50% 48%, rgba(226, 238, 249, 0.96) 0%, rgba(204, 222, 240, 0.98) 58%, rgba(186, 208, 232, 1.0) 100%)';
    }
}

// Возврат с проекта на 3D-планету: настоящие 3D-облака смыкаются на весь экран, затем открывается Земля
let isReturningToGlobe = false;

function openGlobeIntro() {
    const overlay = document.getElementById('globe-intro-overlay');
    const veil = document.getElementById('globe-warp-veil');
    if (!overlay || isReturningToGlobe || isGlobeIntroActive) return;
    isReturningToGlobe = true;

    if (tourState && tourState.active) stopAutoTour(false);
    closeDetailCard();
    closeMobileSidebar();
    closeTelemetryPanel();

    // Скрываем HUD карты и поднимаем камеру над картой, чтобы видеть, как 3D-облака затягивают всё вокруг
    document.body.classList.add('intro-active-hud-hidden');

    const closeX = controls ? controls.target.x : (isFarEastProject() ? -120 : 2);
    const closeZ = controls ? controls.target.z : (isFarEastProject() ? 5 : 8);

    if (camera && controls) {
        const targetAscendY = Math.max(camera.position.y + 85, isFarEastProject() ? 275 : 170);
        const ascendPos = new THREE.Vector3(
            closeX + (camera.position.x - closeX) * 0.65,
            targetAscendY,
            closeZ + (camera.position.z - closeZ) * 0.65 + 22
        );
        cameraTransition.duration = 1.15;
        startCameraFly(ascendPos, new THREE.Vector3(closeX, 0, closeZ));
    }

    // Запускаем смыкание реальных 3D-облаков сцены со всех сторон к центру экрана
    setWorldCloudsAperture('closed', {
        duration: 1.08,
        centerX: closeX,
        centerZ: closeZ,
        onDone: () => {
            // 3D-облака полностью закрыли карту: плавно переходим на 3D-планету
            const pose = computeGlobeBaseCamPose(window.innerWidth, window.innerHeight);
            globeIntro.diving = false;
            globeIntro.mapRevealed = false;
            globeIntro.diveProgress = 0;
            globeIntro.baseCamDist = pose.dist;
            globeIntro.baseLookAtY = pose.lookY;
            globeIntro.lookAtY = pose.lookY;
            globeIntro.camDist = pose.dist * 0.62;
            globeIntro.pullingOut = true;

            if (globeIntro.camera) {
                globeIntro.camera.fov = 42;
                globeIntro.camera.updateProjectionMatrix();
            }

            const a = computeTargetAnglesForSakhalin();
            globeIntro.rotY = a.rotY - 0.16;
            globeIntro.rotX = a.rotX;
            globeIntro.snappingToSakhalin = false;
            globeIntro.emblemElapsed = 0;
            globeIntro.coreAlpha = 0;
            globeIntro.coreTouched = false;
            globeIntro.coreIdleTimer = 99;
            globeIntro.cinematicForceHideCore = false;
            isGlobeIntroActive = true;

            updateWarpVeilTheme();
            if (veil) veil.style.opacity = '0.88';

            overlay.classList.remove('intro-hidden', 'intro-diving');
            startGlobeLoop();

            setTimeout(() => {
                if (veil) veil.style.opacity = '0';
                isReturningToGlobe = false;
                if (cameraTransition) cameraTransition.duration = 1.15;
            }, 180);
        }
    });
}

// Влёт с 3D-планеты в проект: нырок к Сахалину -> закрытые 3D-облака -> рассеивание на S2 или широко на S1
function enterMapFromGlobe() {
    if (globeIntro.diving || isReturningToGlobe) return;
    globeIntro.diving = true;
    globeIntro.pullingOut = false;
    globeIntro.mapRevealed = false;
    globeIntro.diveProgress = 0;
    globeIntro.isDragging = false;

    updateWarpVeilTheme();
    const overlay = document.getElementById('globe-intro-overlay');
    if (overlay) overlay.classList.add('intro-diving');

    const a = computeTargetAnglesForSakhalin();
    let deltaY = (a.rotY - globeIntro.rotY) % (Math.PI * 2);
    if (deltaY > Math.PI) deltaY -= Math.PI * 2;
    if (deltaY < -Math.PI) deltaY += Math.PI * 2;

    globeIntro.diveStartRotY = globeIntro.rotY;
    globeIntro.diveEndRotY = globeIntro.rotY + deltaY;
    globeIntro.diveStartRotX = globeIntro.rotX;
    globeIntro.diveEndRotX = a.rotX;
    globeIntro.diveStartDist = globeIntro.camDist;
    globeIntro.diveStartLookY = globeIntro.lookAtY;
}

const _gCloudDummy = new THREE.Object3D();
const _gProj = new THREE.Vector3();
const _gUp = new THREE.Vector3(0, 1, 0);
const _gNorm = new THREE.Vector3();

function animateGlobeIntro() {
    if (!globeIntro.running) return;
    globeIntro.rafId = requestAnimationFrame(animateGlobeIntro);

    const dt = Math.min(globeIntro.clock.getDelta(), 0.05);
    const elapsed = globeIntro.clock.getElapsedTime();
    const veil = document.getElementById('globe-warp-veil');
    let cameraRoll = 0;

    if (globeIntro.diving) {
        globeIntro.diveProgress += dt / 1.18;
        const t = Math.min(1, globeIntro.diveProgress);

        const lockT = Math.min(1, t / 0.62);
        const lockEase = 1 - Math.pow(1 - lockT, 3);
        globeIntro.rotY = globeIntro.diveStartRotY + (globeIntro.diveEndRotY - globeIntro.diveStartRotY) * lockEase;
        globeIntro.rotX = globeIntro.diveStartRotX + (globeIntro.diveEndRotX - globeIntro.diveStartRotX) * lockEase;
        globeIntro.lookAtY = globeIntro.diveStartLookY * (1 - lockEase);

        const pullT = Math.max(0, Math.min(1, (t - 0.08) / 0.92));
        const suctionCurve = Math.pow(pullT, 2.3);
        globeIntro.camDist = globeIntro.diveStartDist + (10.55 - globeIntro.diveStartDist) * suctionCurve;

        globeIntro.camera.fov = 42 + 36 * Math.pow(pullT, 1.85);
        globeIntro.camera.updateProjectionMatrix();
        cameraRoll = -0.13 * Math.sin(pullT * Math.PI);

        // Короткая дымка в цвет 3D-облаков при входе в верхний слой атмосферы
        if (veil) {
            const mistPeak = Math.max(0, Math.sin(Math.max(0, (t - 0.36) / 0.64) * Math.PI));
            veil.style.opacity = String((mistPeak * 0.92).toFixed(3));
        }

        // На пике сближения переключаемся в 3D-сцену, где реальные 3D-облака УЖЕ ЗАКРЫТЫ поверх карты
        if (t >= 0.62 && !globeIntro.mapRevealed) {
            globeIntro.mapRevealed = true;

            const targetPreset = getWorldCloudPreset(introStartProject);
            snapWorldCloudsClosed(targetPreset.cx, targetPreset.cz);

            // Пока 3D-облака плотно закрывают остров, незаметно применяем платформу и строим нужный проект
            applyPlatformMode(platformModePreference, true);
            if (introStartProject !== activeProject) {
                switchProjectTab(introStartProject);
            }
            // Гарантируем, что облака остаются закрытыми на первом кадре
            snapWorldCloudsClosed(targetPreset.cx, targetPreset.cz);

            isGlobeIntroActive = false;

            // Ставим камеру над закрытыми 3D-облаками и начинаем плавное снижение к Сахалину
            const targetPose = getAdaptiveCameraPose(false);
            if (camera && controls) {
                camera.fov = 56;
                camera.updateProjectionMatrix();
                camera.position.set(
                    targetPose.pos.x * 1.48,
                    targetPose.pos.y * 1.72,
                    targetPose.pos.z * 1.48
                );
                controls.target.copy(targetPose.target);
                cameraTransition.duration = 1.65;
                startCameraFly(targetPose.pos, targetPose.target);
            }

            const overlay = document.getElementById('globe-intro-overlay');
            if (overlay) overlay.classList.add('intro-hidden');

            // После короткого кадра предзагрузки запускаем эффектное рассеивание живых 3D-облаков!
            const openTarget = introStartProject === 'sakhalin1' ? 'sakhalin1' : 'sakhalin2';
            setTimeout(() => {
                if (!isGlobeIntroActive && !isReturningToGlobe) {
                    setWorldCloudsAperture(openTarget, {
                        duration: openTarget === 'sakhalin1' ? 1.80 : 1.55
                    });
                }
            }, 120);

            // Плавно проявляем интерфейс по мере рассеивания облаков
            setTimeout(() => {
                if (!isGlobeIntroActive && !isReturningToGlobe) {
                    document.body.classList.remove('intro-active-hud-hidden');
                }
            }, 480);
        }

        if (t >= 1.0) {
            globeIntro.diving = false;
            setTimeout(() => {
                if (!isGlobeIntroActive) {
                    stopGlobeLoop();
                    if (cameraTransition) cameraTransition.duration = 1.15;
                }
            }, 880);
        }
    } else {
        // Плавное отдаление планеты на базовую дистанцию после выхода из облаков
        if (globeIntro.pullingOut) {
            globeIntro.camDist += (globeIntro.baseCamDist - globeIntro.camDist) * Math.min(1, dt * 3.2);
            if (Math.abs(globeIntro.baseCamDist - globeIntro.camDist) < 0.08) {
                globeIntro.camDist = globeIntro.baseCamDist;
                globeIntro.pullingOut = false;
            }
        }

        if (globeIntro.snappingToSakhalin) {
            let dY = (globeIntro.targetRotY - globeIntro.rotY) % (Math.PI * 2);
            if (dY > Math.PI) dY -= Math.PI * 2;
            if (dY < -Math.PI) dY += Math.PI * 2;
            const dX = globeIntro.targetRotX - globeIntro.rotX;
            globeIntro.rotY += dY * Math.min(1, dt * 5.2);
            globeIntro.rotX += dX * Math.min(1, dt * 5.2);
            if (Math.abs(dY) < 0.008 && Math.abs(dX) < 0.008) {
                globeIntro.snappingToSakhalin = false;
            }
        } else if (!globeIntro.isDragging) {
            globeIntro.rotY += globeIntro.velY;
            globeIntro.rotX = Math.max(-1.25, Math.min(1.25, globeIntro.rotX + globeIntro.velX));
            globeIntro.velY *= Math.pow(0.92, dt * 60);
            globeIntro.velX *= Math.pow(0.92, dt * 60);

            globeIntro.idleTimer += dt;
            if (globeIntro.idleTimer > 2.2) {
                globeIntro.rotY += dt * 0.12;
            }
        }
    }

    globeIntro.planetGroup.rotation.set(globeIntro.rotX, globeIntro.rotY, 0, 'XYZ');
    globeIntro.camera.position.set(0, 0, globeIntro.camDist);
    globeIntro.camera.lookAt(0, globeIntro.lookAtY, 0);
    if (cameraRoll !== 0) {
        globeIntro.camera.rotateZ(cameraRoll);
    }

    // Анимация эмблемы СахГУ над планетой:
    //  - Внешнее кольцо («САХАЛИНСКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ • СахГУ») всегда стационарно обрамляет вращающуюся Землю.
    //  - Центр герба (книга, остров, 1949/1954/1998) остаётся на переднем плане, пока планету НЕ трогают;
    //    как только трогают — плавно углубляется и пропадает; если снова не трогать 3.6 сек — плавно возвращается!
    globeIntro.emblemElapsed += dt;
    const et = globeIntro.emblemElapsed;
    const diveFade = globeIntro.diving ? Math.max(0, 1.0 - globeIntro.diveProgress * 1.65) : 1.0;

    if (globeIntro.sakhguRingMesh) {
        const ringIn = Math.min(1, et / 0.85);
        const ringEase = 1 - Math.pow(1 - ringIn, 3);
        const ringSc = 1.08 - 0.08 * ringEase;
        globeIntro.sakhguRingMesh.scale.setScalar(ringSc);
        globeIntro.sakhguRingMesh.position.set(0, 0, 0);
        // Поворачиваем строго навстречу камере, но НЕ вращаем вместе с планетой!
        globeIntro.sakhguRingMesh.quaternion.copy(globeIntro.camera.quaternion);
        const ringOp = 0.98 * ringEase * diveFade;
        globeIntro.sakhguRingMesh.material.opacity = ringOp;
        globeIntro.sakhguRingMesh.visible = ringOp > 0.005;
    }

    if (globeIntro.sakhguCoreMesh) {
        const userActive = globeIntro.isDragging || globeIntro.snappingToSakhalin || Math.abs(globeIntro.velX) > 0.0008 || Math.abs(globeIntro.velY) > 0.0008;
        if (userActive) {
            globeIntro.coreTouched = true;
            globeIntro.coreIdleTimer = 0;
        } else if (globeIntro.coreTouched && !globeIntro.diving) {
            globeIntro.coreIdleTimer += dt;
            if (globeIntro.coreIdleTimer >= 3.6) {
                globeIntro.coreTouched = false;
            }
        }

        const wantCore = !globeIntro.diving && !globeIntro.coreTouched && !globeIntro.cinematicForceHideCore;
        const targetA = wantCore ? 1.0 : 0.0;
        const rate = targetA < globeIntro.coreAlpha ? 3.0 : 1.45;
        globeIntro.coreAlpha += (targetA - globeIntro.coreAlpha) * Math.min(1, dt * rate);
        if (Math.abs(targetA - globeIntro.coreAlpha) < 0.004) globeIntro.coreAlpha = targetA;

        const e = globeIntro.coreAlpha * globeIntro.coreAlpha * (3.0 - 2.0 * globeIntro.coreAlpha);
        const finalCoreOp = e * diveFade;
        globeIntro.sakhguCoreMesh.visible = finalCoreOp > 0.005;
        if (globeIntro.sakhguCoreMesh.visible) {
            const floatZ = e > 0.85 ? Math.sin(et * 2.0) * 0.18 : 0;
            const zFront = 2.0 + 10.6 * e + floatZ;
            const relScale = 0.62 + 0.41 * e;
            const camD = Math.max(15, globeIntro.camDist);
            const persp = Math.max(0.25, (camD - zFront) / camD);
            globeIntro.sakhguCoreMesh.position.set(0, 0, zFront);
            globeIntro.sakhguCoreMesh.scale.setScalar(persp * relScale);
            globeIntro.sakhguCoreMesh.quaternion.copy(globeIntro.camera.quaternion);
            globeIntro.sakhguCoreMesh.material.opacity = finalCoreOp;
        }
    }

    if (globeIntro.starField) {
        globeIntro.starField.rotation.y = elapsed * 0.012;
    }

    if (globeIntro.pinCrystal) {
        globeIntro.pinCrystal.rotation.y = elapsed * 2.2;
        globeIntro.pinCrystal.position.y = 0.62 + Math.sin(elapsed * 3.4) * 0.08;
    }
    for (let i = 0; i < globeIntro.beaconRings.length; i++) {
        const br = globeIntro.beaconRings[i];
        const wave = ((elapsed * 0.85 + br.phase / (Math.PI * 2)) % 1.0);
        br.mesh.scale.setScalar(0.85 + wave * 2.3);
        br.mesh.material.opacity = (1.0 - wave) * 0.85;
    }

    if (globeIntro.cloudMesh) {
        for (let i = 0; i < globeIntro.cloudItems.length; i++) {
            const cl = globeIntro.cloudItems[i];
            const curLon = cl.lon + elapsed * cl.speed;
            const p = globeLatLonToVec3(cl.lat, curLon, cl.r);
            _gNorm.copy(p).normalize();
            _gCloudDummy.position.copy(p);
            _gCloudDummy.quaternion.setFromUnitVectors(_gUp, _gNorm);
            _gCloudDummy.scale.set(cl.sx, cl.sy, cl.sz);
            _gCloudDummy.updateMatrix();
            globeIntro.cloudMesh.setMatrixAt(i, _gCloudDummy.matrix);
        }
        globeIntro.cloudMesh.instanceMatrix.needsUpdate = true;
    }

    const pinEl = document.getElementById('globe-sakhalin-pin');
    if (pinEl && globeIntro.sakhalinLocalPos) {
        globeIntro.planetGroup.updateMatrixWorld();
        globeIntro.sakhalinWorldPos.copy(globeIntro.sakhalinLocalPos).applyMatrix4(globeIntro.planetGroup.matrixWorld);
        const isFront = globeIntro.sakhalinWorldPos.z > 2.2 && !globeIntro.diving && (!globeIntro.sakhguCoreMesh || globeIntro.coreAlpha < 0.45);
        if (!isFront) {
            pinEl.style.display = 'none';
        } else {
            _gProj.copy(globeIntro.sakhalinWorldPos).project(globeIntro.camera);
            const sx = Math.round((_gProj.x * 0.5 + 0.5) * window.innerWidth);
            const sy = Math.round((-_gProj.y * 0.5 + 0.5) * window.innerHeight);
            pinEl.style.display = 'block';
            pinEl.style.transform = 'translate3d(' + sx + 'px, ' + (sy - 14) + 'px, 0) translate(-50%, -100%)';
        }
    }

    globeIntro.renderer.render(globeIntro.scene, globeIntro.camera);
}

