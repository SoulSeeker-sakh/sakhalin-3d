'use strict';

// =========================================================================
// [BLOCK:TERRAIN_OCEAN]
// 5. ПОСТРОЕНИЕ 3D-РЕЛЬЕФА ОСТРОВА, ЗИМНЕГО СЕЗОНА, ЛЬДОВ И ОКЕАНА
// =========================================================================
function buildSakhalinIsland() {
    const width = ISLAND_AABB.maxX - ISLAND_AABB.minX;
    const depth = ISLAND_AABB.maxZ - ISLAND_AABB.minZ;
    const centerX = (ISLAND_AABB.minX + ISLAND_AABB.maxX) * 0.5;
    const centerZ = (ISLAND_AABB.minZ + ISLAND_AABB.maxZ) * 0.5;

    const segX = 140;
    const segZ = 310;
    const cols = segX + 1;
    const rows = segZ + 1;

    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(centerX, 0, centerZ);

    const posAttr = geo.attributes.position;
    const count = posAttr.count;
    let heights = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        heights[i] = getSakhalinElevation(posAttr.getX(i), posAttr.getZ(i));
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
                const sum =
                    heights[idx] * 4 +
                    heights[idx - 1] * 2 + heights[idx + 1] * 2 +
                    heights[idx - cols] * 2 + heights[idx + cols] * 2 +
                    heights[idx - cols - 1] + heights[idx - cols + 1] +
                    heights[idx + cols - 1] + heights[idx + cols + 1];
                nextHeights[idx] = sum / 16;
            }
        }
        const swap = heights;
        heights = nextHeights;
        nextHeights = swap;
    }

    islandSummerColors = new Float32Array(count * 3);
    islandWinterColors = new Float32Array(count * 3);
    const activeColors = new Float32Array(count * 3);

    const colDeepShelf = new THREE.Color(0x0b4f6c);
    const colSand = new THREE.Color(0xc2b280);
    const colValleyGreen = new THREE.Color(0x3a7d44);
    const colForestGreen = new THREE.Color(0x215732);
    const colHighTaiga = new THREE.Color(0x184227);
    const colRock = new THREE.Color(0x64748b);
    const colSnowPeak = new THREE.Color(0xe2e8f0);

    const colWinterShelf = new THREE.Color(0x0e4766);
    const colWinterShore = new THREE.Color(0xbfd8ec);
    const colWinterSnow = new THREE.Color(0xe6f1fa);
    const colWinterHigh = new THREE.Color(0xf8fbff);

    const tempSummer = new THREE.Color();
    const tempWinter = new THREE.Color();

    for (let i = 0; i < count; i++) {
        const h = heights[i];
        // Уводим плоский подводный шлейф прямоугольника islandMesh глубже subseaSeabedMesh (-2.42),
        // чтобы в подводном режиме X-Ray не было Z-файтинга и видимой прямоугольной рамки вокруг острова
        const meshY = h < -0.45 ? (-0.45 + (h + 0.45) * 3.2) : h;
        posAttr.setY(i, meshY);

        if (h < -0.18) {
            tempSummer.copy(colDeepShelf);
            tempWinter.copy(colWinterShelf);
        } else if (h < 0.24) {
            const t = Math.max(0, (h + 0.18) / 0.42);
            tempSummer.lerpColors(colSand, colValleyGreen, t);
            tempWinter.lerpColors(colWinterShelf, colWinterShore, t);
        } else if (h < 1.35) {
            const t = (h - 0.24) / 1.11;
            tempSummer.lerpColors(colValleyGreen, colForestGreen, t);
            tempWinter.lerpColors(colWinterShore, colWinterSnow, t);
        } else if (h < 2.30) {
            const t = (h - 1.35) / 0.95;
            tempSummer.lerpColors(colForestGreen, colHighTaiga, t);
            tempWinter.lerpColors(colWinterSnow, colWinterHigh, t);
        } else if (h < 2.95) {
            const t = (h - 2.30) / 0.65;
            tempSummer.lerpColors(colHighTaiga, colRock, t);
            tempWinter.copy(colWinterHigh);
        } else {
            const t = Math.min(1, (h - 2.95) / 0.65);
            tempSummer.lerpColors(colRock, colSnowPeak, t);
            tempWinter.copy(colWinterHigh);
        }

        const idx3 = i * 3;
        islandSummerColors[idx3] = tempSummer.r;
        islandSummerColors[idx3 + 1] = tempSummer.g;
        islandSummerColors[idx3 + 2] = tempSummer.b;

        islandWinterColors[idx3] = tempWinter.r;
        islandWinterColors[idx3 + 1] = tempWinter.g;
        islandWinterColors[idx3 + 2] = tempWinter.b;

        activeColors[idx3] = tempSummer.r;
        activeColors[idx3 + 1] = tempSummer.g;
        activeColors[idx3 + 2] = tempSummer.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(activeColors, 3));
    geo.computeVertexNormals();

    const islandMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.82,
        metalness: 0.03
    });

    islandMesh = new THREE.Mesh(geo, islandMat);
    islandMesh.receiveShadow = true;
    islandMesh.castShadow = true;
    scene.add(islandMesh);
}

function applyWinterTerrainBlend(mix) {
    if (islandMesh && islandSummerColors && islandWinterColors) {
        const colAttr = islandMesh.geometry.attributes.color;
        const arr = colAttr.array;
        const inv = 1 - mix;
        for (let i = 0; i < arr.length; i++) {
            arr[i] = islandSummerColors[i] * inv + islandWinterColors[i] * mix;
        }
        colAttr.needsUpdate = true;
    }
    if (taigaMesh && taigaMesh.material) {
        taigaMesh.material.color.lerpColors(_summerTaigaTint, _winterTaigaTint, mix);
        updateTaigaPointsTint();
    }
    updateSakhalin1CloudsColor();
    if (seaIceMesh) {
        seaIceMesh.visible = mix > 0.02;
        seaIceMesh.material.opacity = Math.min(1.0, mix);
    }
    for (let i = 0; i < moneronWinterMats.length; i++) {
        const entry = moneronWinterMats[i];
        entry.mat.color.copy(entry.orig).lerp(_moneronSnowColor, mix);
    }
    if (sakhalin1Built && s1MainlandMesh && s1SummerColors && s1WinterColors) {
        const s1Attr = s1MainlandMesh.geometry.attributes.color;
        const s1Arr = s1Attr.array;
        const inv = 1 - mix;
        for (let i = 0; i < s1Arr.length; i++) {
            s1Arr[i] = s1SummerColors[i] * inv + s1WinterColors[i] * mix;
        }
        s1Attr.needsUpdate = true;
        if (s1TaigaMesh && s1TaigaMesh.material) {
            s1TaigaMesh.material.color.lerpColors(_summerTaigaTint, _winterTaigaTint, mix);
        }
        if (s1SeaIceMesh) {
            s1SeaIceMesh.visible = mix > 0.02;
            s1SeaIceMesh.material.opacity = Math.min(1.0, mix);
        }
        updateNeighborLandsColor();
        updateSakhalin1CloudsColor();
        updateFarEastBackdropColor();
    }
}

let seaIceObstacles = [];

function buildSeaIceFloes() {
    const floeCount = 520;
    const iceGeo = new THREE.CylinderGeometry(0.68, 0.78, 0.16, 7);
    const iceMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.42,
        metalness: 0.04,
        flatShading: true,
        transparent: true,
        opacity: 0.0,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2
    });

    seaIceMesh = new THREE.InstancedMesh(iceGeo, iceMat, floeCount);
    seaIceMesh.visible = false;
    seaIceFloes = [];

    const obstacleSpecs = [
        { lon: 143.62, lat: 53.02, r: 3.6 }, // ПА-Б
        { lon: 143.65, lat: 52.71, r: 3.5 }, // ПА-А «Моликпак»
        { lon: 143.78, lat: 51.68, r: 3.6 }, // ЛУН-А
        { lon: 143.92, lat: 52.44, r: 4.0 }, // Беркут (S1)
        { lon: 143.56, lat: 52.32, r: 3.5 }, // Орлан (S1)
        { lon: 144.63, lat: 48.50, r: 3.2 }, // о. Тюлений
        { lon: 143.15, lat: 46.54, r: 3.4 }, // ТОН
        { lon: 143.43, lat: 46.01, r: 2.8 }  // Маяк Анива
    ];
    seaIceObstacles = obstacleSpecs.map(o => {
        const [ox, oz] = lonLatToXZ(o.lon, o.lat);
        return { x: ox, z: oz, r: o.r };
    });

    let seed = 918273;
    function nextRand() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    const icePalette = [
        new THREE.Color(0xf2f8ff),
        new THREE.Color(0xe5f2fd),
        new THREE.Color(0xd9ebf9),
        new THREE.Color(0xedf6fe)
    ];

    let placed = 0;
    let attempts = 0;
    const [anivaMaxX, anivaMinZ] = lonLatToXZ(143.48, 47.05);
    const [, laPerouseMaxZ] = lonLatToXZ(143.55, 45.55);

    while (placed < floeCount && attempts < 18000) {
        attempts++;
        // Мощный Восточно-Сахалинский ледяной щит (от п-ова Шмидта вдоль платформ и залива Терпения до мыса Анива):
        // залив Анива (Пригородное / СПГ) и пролив Лаперуза остаются чистыми (тёплое течение Соя)
        const latT = Math.pow(nextRand(), 0.72);
        const lat = 45.95 + latT * 8.85;

        let coastBaseLon;
        if (lat > 50.0) {
            coastBaseLon = 143.15;
        } else if (lat > 48.25) {
            coastBaseLon = 142.82; // Залив Терпения — плотный сплочённый лёд
        } else if (lat > 47.25) {
            coastBaseLon = 143.22;
        } else {
            coastBaseLon = 143.52; // Строго восточнее мыса Анива (обходит залив Анива)
        }

        const spreadFactor = 0.85 + 0.75 * Math.sin((lat - 45.2) * 0.46);
        const lonOffset = Math.pow(nextRand(), 1.45) * (3.65 * spreadFactor);
        const lon = coastBaseLon + lonOffset;
        const [fx, fz] = lonLatToXZ(lon, lat);

        // Полностью держим залив Анива и пролив Лаперуза чистыми для газовозов и танкеров
        if (fz > anivaMinZ && fx < anivaMaxX) continue;
        if (isPointInPolygon(fx, fz, SAKHALIN_OUTLINE)) continue;

        const shoreDist = distanceToShoreline(fx, fz, SAKHALIN_OUTLINE);
        const maxAllowedDist = (lat > 50.0 ? 28.0 : 22.0) + nextRand() * 14.0;
        if (shoreDist < 1.25 || shoreDist > maxAllowedDist) continue;

        let hitsObs = false;
        for (let k = 0; k < seaIceObstacles.length; k++) {
            const ob = seaIceObstacles[k];
            if (Math.hypot(fx - ob.x, fz - ob.z) < ob.r) {
                hitsObs = true;
                break;
            }
        }
        if (hitsObs) continue;

        const indMinZ = -128 + nextRand() * 26;
        const indMaxZ = Math.min(laPerouseMaxZ, 92 + nextRand() * 26);
        const southT = Math.max(0, Math.min(1, (indMaxZ - fz) / 140));
        const sizeBase = (0.85 + nextRand() * 1.55) * (0.68 + 0.40 * southT);
        const sx = sizeBase * (0.80 + nextRand() * 0.45);
        const sz = sizeBase * (0.80 + nextRand() * 0.45);
        const approxRad = Math.max(sx, sz) * 0.78;

        // Исключаем наслоение льдин друг на друга (убивает Z-fighting и мутные пятна!)
        let overlaps = false;
        for (let k = 0; k < seaIceFloes.length; k++) {
            const o = seaIceFloes[k];
            const minD = (approxRad + o.rad) * 0.92;
            const dx = fx - o.x;
            const dz = fz - o.z;
            if (dx * dx + dz * dz < minD * minD) {
                overlaps = true;
                break;
            }
        }
        if (overlaps) continue;

        // Разводим микро-высоту по слоям, чтобы даже при дрейфе не возникало ряби на стыке
        const yLayer = 0.08 + (placed % 9) * 0.011;

        const floe = {
            baseX: fx,
            x: fx,
            z: fz,
            yBase: yLayer,
            rad: approxRad,
            minZ: indMinZ,
            maxZ: indMaxZ,
            driftSpeed: 0.32 + nextRand() * 0.36,
            rotY: nextRand() * Math.PI * 2,
            rotSpeed: (nextRand() - 0.5) * 0.14,
            scaleX: sx,
            scaleZ: sz,
            phase: nextRand() * Math.PI * 2
        };
        seaIceFloes.push(floe);

        _iceDummy.position.set(floe.x, floe.yBase, floe.z);
        _iceDummy.rotation.set(0, floe.rotY, 0);
        _iceDummy.scale.set(floe.scaleX, 1, floe.scaleZ);
        _iceDummy.updateMatrix();
        seaIceMesh.setMatrixAt(placed, _iceDummy.matrix);
        seaIceMesh.setColorAt(placed, icePalette[placed % icePalette.length]);
        placed++;
    }

    seaIceMesh.count = placed;
    seaIceMesh.instanceMatrix.needsUpdate = true;
    if (seaIceMesh.instanceColor) seaIceMesh.instanceColor.needsUpdate = true;
    scene.add(seaIceMesh);
}

function toggleWinterMode() {
    isWinterMode = !isWinterMode;
    applyWinterTerrainBlend(isWinterMode ? 1.0 : 0.0);

    const dText = document.getElementById('desktop-winter-text');
    const mBtn = document.getElementById('btn-mobile-winter');
    if (dText) dText.textContent = isWinterMode ? 'Сезон: Зима' : 'Сезон: Лето';
    if (mBtn) {
        mBtn.classList.toggle('text-sky-300', isWinterMode);
        mBtn.classList.toggle('border-sky-300/70', isWinterMode);
        mBtn.classList.toggle('bg-sky-500/20', isWinterMode);
        mBtn.classList.toggle('text-slate-300', !isWinterMode);
    }
    showToast(isWinterMode ? 'Зимний сезон: снег и дрейфующий лёд' : 'Летний сезон: зелёная тайга Сахалина');
}

function buildRealisticOcean() {
    waterUniforms = {
        uTime: { value: 0 },
        uNightMix: { value: 0 },
        uSubseaMix: { value: 0 },
        uFarEastMix: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.55, 0.75, 0.35).normalize() }
    };

    const waterGeo = new THREE.PlaneGeometry(600, 600, 48, 48);
    const waterMat = new THREE.ShaderMaterial({
        uniforms: waterUniforms,
        transparent: false,
        depthWrite: true,
        vertexShader: `
            uniform float uTime;
            varying vec3 vWorldPos;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                float wave = sin(worldPosition.x * 0.14 + uTime * 1.1) * 0.045 +
                             cos(worldPosition.z * 0.12 - uTime * 0.85) * 0.045;
                worldPosition.y += wave;
                vWorldPos = worldPosition.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPosition;
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uNightMix;
            uniform float uSubseaMix;
            uniform float uFarEastMix;
            uniform vec3 uSunDir;
            varying vec3 vWorldPos;

            void main() {
                vec2 p = vWorldPos.xz;
                float w1 = sin(p.x * 0.45 + p.y * 0.25 + uTime * 1.4);
                float w2 = cos(p.x * 0.32 - p.y * 0.52 + uTime * 1.1);
                float w3 = sin((p.x + p.y) * 0.85 - uTime * 1.9);

                vec3 normal = normalize(vec3(
                    (w1 * 0.05 + w3 * 0.025),
                    1.0,
                    (w2 * 0.05 - w3 * 0.025)
                ));

                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);

                vec3 deepSea = mix(vec3(0.015, 0.14, 0.27), vec3(0.006, 0.032, 0.085), uNightMix);
                vec3 shallowSea = mix(vec3(0.03, 0.30, 0.45), vec3(0.012, 0.085, 0.165), uNightMix);
                float distFromCenter = length((p - vec2(4.0, 5.0)) * vec2(1.4, 0.42));
                float shelfFactor = smoothstep(130.0, 22.0, distFromCenter);

                vec3 waterCol = mix(deepSea, shallowSea, shelfFactor * 0.65);

                vec3 halfVec = normalize(uSunDir + viewDir);
                float spec = pow(max(dot(normal, halfVec), 0.0), mix(96.0, 140.0, uNightMix));
                vec3 glintColor = mix(vec3(1.0, 0.96, 0.85), vec3(0.65, 0.82, 1.0), uNightMix);
                vec3 sunGlint = glintColor * spec * mix(0.6, 0.45, uNightMix);

                vec3 skyReflect = mix(vec3(0.22, 0.50, 0.72), vec3(0.06, 0.13, 0.26), uNightMix);
                vec3 finalColor = mix(waterCol, skyReflect, fresnel * 0.45) + sunGlint;

                float sx = smoothstep(0.965, 1.0, abs(sin(p.x * 0.42)));
                float sz = smoothstep(0.965, 1.0, abs(sin(p.y * 0.42)));
                finalColor += vec3(0.10, 0.40, 0.55) * max(sx, sz) * uSubseaMix * 0.38;

                vec3 fogCol = mix(vec3(0.012, 0.075, 0.15), vec3(0.008, 0.024, 0.075), uNightMix);
                float fogStart = mix(160.0, 560.0, uFarEastMix);
                float fogEnd = mix(295.0, 1020.0, uFarEastMix);
                float fogFactor = smoothstep(fogStart, fogEnd, length(p));
                finalColor = mix(finalColor, fogCol, fogFactor);

                float waterAlpha = mix(1.0, 0.34, uSubseaMix);
                gl_FragColor = vec4(finalColor, waterAlpha);
            }
        `
    });

    waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.0;
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);
}

