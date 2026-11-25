'use strict';

function buildNeighboringIslands() {
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.82 });
    const beachMat = new THREE.MeshStandardMaterial({ color: 0xc2b280, roughness: 0.9 });

    const tyuleny = new THREE.Group();
    const [tx, tz] = lonLatToXZ(144.63, 48.50);
    tyuleny.position.set(tx, 0.05, tz);

    const tShelf = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.45, 0.22, 12), beachMat);
    tShelf.position.y = 0.08;
    tyuleny.add(tShelf);

    const tPlateau = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.34, 0.55), rockMat);
    tPlateau.position.y = 0.26;
    tPlateau.rotation.y = 0.35;
    tPlateau.castShadow = true;
    tyuleny.add(tPlateau);
    scene.add(tyuleny);

    const moneron = new THREE.Group();
    moneron.userData.tag = 'island-moneron';
    const [mx, mz] = lonLatToXZ(141.24, 46.25);
    moneron.position.set(mx, 0.05, mz);

    const mBeachMat = beachMat.clone();
    const mGrassMat = grassMat.clone();
    const mRockMat = rockMat.clone();
    moneronWinterMats = [
        { mat: mBeachMat, orig: mBeachMat.color.clone() },
        { mat: mGrassMat, orig: mGrassMat.color.clone() },
        { mat: mRockMat,  orig: mRockMat.color.clone() }
    ];

    const mBase = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 2.25, 0.45, 14), mBeachMat);
    mBase.position.y = 0.14;
    moneron.add(mBase);

    const mHill1 = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.45, 10), mGrassMat);
    mHill1.position.set(-0.2, 0.95, 0.15);
    mHill1.castShadow = true;
    moneron.add(mHill1);

    const mHill2 = new THREE.Mesh(new THREE.ConeGeometry(1.10, 1.15, 9), mRockMat);
    mHill2.position.set(0.45, 0.80, -0.35);
    mHill2.castShadow = true;
    moneron.add(mHill2);

    scene.add(moneron);
}

function buildSakhalinNatureLandmarks() {
    natureLandmarksGroup = new THREE.Group();
    natureLandmarksGroup.userData.tag = 'nature-landmarks';
    natureLandmarksGroup.visible = isNatureVisible;
    scene.add(natureLandmarksGroup);

    const darkCliffMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92 });
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.05, flatShading: true });
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const waterLagoonMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.22,
        metalness: 0.25,
        transparent: true,
        opacity: 0.92
    });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const brickRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 });

    // 1. Скалы «Три Брата» — три базальтовых кекура в открытой воде Татарского пролива
    const brothersGroup = new THREE.Group();
    brothersGroup.userData.tag = 'three-brothers';
    const [tbX, tbZ] = lonLatToXZ(142.11, 50.89);
    brothersGroup.position.set(tbX - 2.35, 0.0, tbZ + 0.15);

    [
        { x: -0.78, z:  0.22, r: 0.44, h: 1.95 },
        { x:  0.02, z: -0.18, r: 0.48, h: 2.35 },
        { x:  0.76, z:  0.28, r: 0.36, h: 1.48 }
    ].forEach(sp => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(sp.r, sp.h, 5), basaltMat);
        cone.position.set(sp.x, sp.h * 0.46, sp.z);
        cone.rotation.y = sp.x * 2.1;
        cone.castShadow = true;
        brothersGroup.add(cone);

        const foam = new THREE.Mesh(new THREE.RingGeometry(sp.r * 0.85, sp.r * 1.28, 12), foamMat);
        foam.rotation.x = -Math.PI / 2;
        foam.position.set(sp.x, 0.06, sp.z);
        brothersGroup.add(foam);
    });
    natureLandmarksGroup.add(brothersGroup);

    // 2. Хребет Жданко
    const zhdankoGroup = new THREE.Group();
    zhdankoGroup.userData.tag = 'zhdanko-ridge';
    const [zx, zz] = lonLatToXZ(142.66, 48.08);
    const zh = Math.max(0.5, getSakhalinElevation(zx, zz));
    zhdankoGroup.position.set(zx, zh - 0.1, zz);

    [-1.1, -0.35, 0.4, 1.15].forEach((dz, idx) => {
        const ph = 1.05 + (idx % 2) * 0.35;
        const peak = new THREE.Mesh(new THREE.ConeGeometry(0.42, ph, 5), darkCliffMat);
        peak.position.set((idx % 2 === 0 ? 0.08 : -0.06), ph * 0.48, dz);
        peak.castShadow = true;
        zhdankoGroup.add(peak);
    });
    natureLandmarksGroup.add(zhdankoGroup);

    // 3. Мыс Крильон со вторым историческим маяком (кирпично-красный, поднят на мыс)
    const krillonGroup = new THREE.Group();
    krillonGroup.userData.tag = 'cape-krillon';
    const [kx, kz] = lonLatToXZ(142.08, 45.89);
    const kh = Math.max(0.32, getSakhalinElevation(kx, kz)) + 0.22;
    krillonGroup.position.set(kx, kh, kz);

    const kTower = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.95, 12), brickRedMat);
    kTower.position.y = 0.48;
    kTower.castShadow = true;
    const kLantern = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.18, 10),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    kLantern.position.y = 1.04;
    const kDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 6), whiteMat);
    kDome.position.y = 1.15;
    krillonGroup.add(kTower, kLantern, kDome);
    natureLandmarksGroup.add(krillonGroup);

    // 4. Реки Поронай и Тымь
    function addRiverRibbon(lonLatPoints, radius) {
        const vecs = lonLatPoints.map(([lon, lat]) => {
            const [rx, rz] = lonLatToXZ(lon, lat);
            const ry = Math.max(0.15, getSakhalinElevation(rx, rz)) + 0.07;
            return new THREE.Vector3(rx, ry, rz);
        });
        const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal');
        const sampled = curve.getPoints(48).map(p => {
            const h = Math.max(0.14, getSakhalinElevation(p.x, p.z));
            return new THREE.Vector3(p.x, h + 0.07, p.z);
        });
        const smoothRiver = new THREE.CatmullRomCurve3(sampled, false, 'centripetal');
        const riverMesh = new THREE.Mesh(
            new THREE.TubeGeometry(smoothRiver, 60, radius, 5, false),
            waterLagoonMat
        );
        riverMesh.scale.set(1, 0.35, 1);
        natureLandmarksGroup.add(riverMesh);
    }

    addRiverRibbon([
        [142.85, 50.65], [142.90, 50.25], [142.95, 49.85], [143.02, 49.50], [143.10, 49.23]
    ], 0.18);

    addRiverRibbon([
        [142.68, 50.95], [142.78, 51.30], [142.95, 51.60], [143.12, 51.82]
    ], 0.16);
}

function buildCoastalSurf() {
    const count = SAKHALIN_OUTLINE.length;
    if (count < 3) return;

    const positions = new Float32Array(count * 2 * 3);
    const uvs = new Float32Array(count * 2 * 2);
    const indices = [];

    for (let i = 0; i < count; i++) {
        const curr = SAKHALIN_OUTLINE[i];
        const prev = SAKHALIN_OUTLINE[(i - 1 + count) % count];
        const next = SAKHALIN_OUTLINE[(i + 1) % count];

        const tx = next[0] - prev[0];
        const tz = next[1] - prev[1];
        const len = Math.hypot(tx, tz) || 1;
        let nx = -tz / len;
        let nz = tx / len;

        if (isPointInPolygon(curr[0] + nx * 0.25, curr[1] + nz * 0.25, SAKHALIN_OUTLINE)) {
            nx = -nx;
            nz = -nz;
        }

        const ix = curr[0] - nx * 0.12;
        const iz = curr[1] - nz * 0.12;
        const ox = curr[0] + nx * 0.95;
        const oz = curr[1] + nz * 0.95;

        const vIdx = i * 6;
        positions[vIdx] = ix;
        positions[vIdx + 1] = 0.045;
        positions[vIdx + 2] = iz;
        positions[vIdx + 3] = ox;
        positions[vIdx + 4] = 0.035;
        positions[vIdx + 5] = oz;

        const uIdx = i * 4;
        const uCoord = (i / count) * 28.0;
        uvs[uIdx] = uCoord;
        uvs[uIdx + 1] = 0.0;
        uvs[uIdx + 2] = uCoord;
        uvs[uIdx + 3] = 1.0;

        const nextI = (i + 1) % count;
        const a = i * 2;
        const b = i * 2 + 1;
        const c = nextI * 2;
        const d = nextI * 2 + 1;
        indices.push(a, b, c, b, d, c);
    }

    const surfGeo = new THREE.BufferGeometry();
    surfGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    surfGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    surfGeo.setIndex(indices);

    surfUniforms = {
        uTime: { value: 0 },
        uNightMix: { value: 0 }
    };

    const surfMat = new THREE.ShaderMaterial({
        uniforms: surfUniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uNightMix;
            varying vec2 vUv;
            void main() {
                float wave = sin(vUv.y * 12.0 - uTime * 2.4 + sin(vUv.x * 2.5) * 1.4);
                float foam = smoothstep(0.15, 0.92, wave);
                float edgeFade = sin(vUv.y * 3.14159);
                float shoreBoost = smoothstep(0.55, 0.02, vUv.y) * 0.45;
                float alpha = (foam * 0.42 + shoreBoost) * edgeFade * mix(1.0, 0.48, uNightMix);
                vec3 col = mix(vec3(0.84, 0.95, 1.0), vec3(0.45, 0.68, 0.90), uNightMix);
                gl_FragColor = vec4(col, alpha);
            }
        `
    });

    const surfMesh = new THREE.Mesh(surfGeo, surfMat);
    scene.add(surfMesh);
}

function buildSubseaStructures() {
    subseaGroup = new THREE.Group();
    subseaGroup.visible = false;
    scene.add(subseaGroup);

    const seabedMat = new THREE.MeshStandardMaterial({
        color: 0x082f49,
        roughness: 0.92,
        metalness: 0.05
    });
    subseaSeabedMesh = new THREE.Mesh(new THREE.PlaneGeometry(580, 580, 1, 1), seabedMat);
    subseaSeabedMesh.rotation.x = -Math.PI / 2;
    subseaSeabedMesh.position.y = -2.42;
    subseaGroup.add(subseaSeabedMesh);

    subseaS2Group = new THREE.Group();
    subseaGroup.add(subseaS2Group);

    const concreteBaseMat = new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.72,
        metalness: 0.15
    });
    const steelCaissonMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.6,
        metalness: 0.4
    });
    const wellPipeMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.3
    });
    const subseaOilMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xd97706,
        emissiveIntensity: 0.35,
        roughness: 0.35
    });
    const subseaGasMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x059669,
        emissiveIntensity: 0.35,
        roughness: 0.35
    });

    const [pabX, pabZ] = lonLatToXZ(143.62, 53.02);
    const pabSlab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 2.6), concreteBaseMat);
    pabSlab.position.set(pabX, -2.12, pabZ);
    subseaS2Group.add(pabSlab);
    [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]].forEach(([lx, lz]) => {
        const subLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.44, 2.0, 12), concreteBaseMat);
        subLeg.position.set(pabX + lx, -1.0, pabZ + lz);
        subseaS2Group.add(subLeg);
    });

    const [paaX, paaZ] = lonLatToXZ(143.65, 52.71);
    const paaBase = new THREE.Mesh(new THREE.CylinderGeometry(1.46, 1.75, 2.25, 8), steelCaissonMat);
    paaBase.position.set(paaX, -1.12, paaZ);
    subseaS2Group.add(paaBase);

    const [lunX, lunZ] = lonLatToXZ(143.78, 51.68);
    const lunSlab = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.6, 2.7), concreteBaseMat);
    lunSlab.position.set(lunX, -2.10, lunZ);
    subseaS2Group.add(lunSlab);
    [[-0.68, -0.68], [0.68, -0.68], [-0.68, 0.68], [0.68, 0.68]].forEach(([lx, lz]) => {
        const subLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.45, 2.05, 12), concreteBaseMat);
        subLeg.position.set(lunX + lx, -1.02, lunZ + lz);
        subseaS2Group.add(subLeg);
    });

    [
        [pabX, pabZ, 3],
        [paaX, paaZ, 2],
        [lunX, lunZ, 4]
    ].forEach(([wx, wz, cnt], idx) => {
        for (let k = 0; k < cnt; k++) {
            const offX = (k - (cnt - 1) * 0.5) * 0.34;
            const well = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.6, 8), wellPipeMat);
            well.position.set(wx + offX, -1.25, wz + 0.15);
            subseaS2Group.add(well);
        }
        const pulse = new THREE.Mesh(
            new THREE.RingGeometry(1.5, 1.85, 24),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
        );
        pulse.rotation.x = -Math.PI / 2;
        pulse.position.set(wx, -2.36, wz);
        subseaS2Group.add(pulse);
        subseaPulseNodes.push({ mesh: pulse, phase: idx * 1.4 });
    });

    function addSubseaPipe(lonLatPts, mat, offsetX = 0) {
        const vecs = lonLatPts.map(([lon, lat]) => {
            const [x, z] = lonLatToXZ(lon, lat);
            const y = Math.min(-0.15, Math.max(-2.22, getSakhalinElevation(x, z) + 0.16));
            return new THREE.Vector3(x + offsetX, y, z);
        });
        const curve = new THREE.CatmullRomCurve3(vecs, false, 'centripetal');
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.11, 7, false), mat);
        subseaS2Group.add(tube);
    }

    addSubseaPipe([[143.62, 53.02], [144.07, 53.02], [144.07, 52.42], [143.14, 52.42]], subseaOilMat, -0.22);
    addSubseaPipe([[143.62, 53.02], [144.07, 53.02], [144.07, 52.42], [143.14, 52.42]], subseaGasMat, 0.22);
    addSubseaPipe([[143.65, 52.71], [144.07, 52.71]], subseaOilMat, 0);
    addSubseaPipe([[143.78, 51.68], [143.22, 51.68]], subseaGasMat, 0);

}

function buildNauticalGrid() {
    nauticalGridGroup = new THREE.Group();
    nauticalGridGroup.visible = isGridVisible;
    scene.add(nauticalGridGroup);

    const lineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.24
    });

    const lats = [46, 48, 50, 52, 54];
    const lons = [141, 143, 145];

    lats.forEach(lat => {
        const [x1, z1] = lonLatToXZ(139.8, lat);
        const [x2, z2] = lonLatToXZ(146.2, lat);
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x1, 0.14, z1),
            new THREE.Vector3(x2, 0.14, z2)
        ]);
        nauticalGridGroup.add(new THREE.Line(geo, lineMat));
    });

    lons.forEach(lon => {
        const [x1, z1] = lonLatToXZ(lon, 45.0);
        const [x2, z2] = lonLatToXZ(lon, 55.0);
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x1, 0.14, z1),
            new THREE.Vector3(x2, 0.14, z2)
        ]);
        nauticalGridGroup.add(new THREE.Line(geo, lineMat));
    });
}

const _taigaPtsTmpColor = new THREE.Color();

function createTaigaPointsFromInstanced(instMesh, pointSize) {
    const count = instMesh.count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const colArr = instMesh.instanceColor ? instMesh.instanceColor.array : null;

    for (let i = 0; i < count; i++) {
        instMesh.getMatrixAt(i, m);
        pos.setFromMatrixPosition(m);
        const j = i * 3;
        positions[j] = pos.x;
        positions[j + 1] = pos.y + 0.38;
        positions[j + 2] = pos.z;

        if (colArr) {
            colors[j] = colArr[j];
            colors[j + 1] = colArr[j + 1];
            colors[j + 2] = colArr[j + 2];
        } else {
            colors[j] = 0.10;
            colors[j + 1] = 0.32;
            colors[j + 2] = 0.16;
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: pointSize,
        vertexColors: true,
        color: 0xffffff,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.88
    });

    const pts = new THREE.Points(geo, mat);
    pts.visible = false;
    return pts;
}

function updateTaigaPointsTint() {
    const rawW = (typeof winterMix !== 'undefined') ? winterMix : (isWinterMode ? 1.0 : 0.0);
    const wMix = rawW * rawW * (3.0 - 2.0 * rawW);
    const nightScale = 1.0 - nightMix * 0.62;
    _taigaPtsTmpColor.lerpColors(_summerTaigaTint, _winterTaigaTint, wMix).multiplyScalar(nightScale);
    if (taigaPoints && taigaPoints.material) {
        taigaPoints.material.color.copy(_taigaPtsTmpColor);
    }
    if (s1TaigaPoints && s1TaigaPoints.material) {
        s1TaigaPoints.material.color.copy(_taigaPtsTmpColor);
    }
}

function updateTaigaLod() {
    if (!camera || !controls) return;
    const camDist = camera.position.distanceTo(controls.target);
    const mobileMult = isMobileViewport() ? 1.24 : 1.0;

    if (taigaMesh && taigaPoints) {
        const show3DSakh = camDist < 148 * mobileMult;
        taigaMesh.visible = show3DSakh;
        taigaPoints.visible = !show3DSakh;
    }
    if (s1TaigaMesh && s1TaigaPoints) {
        const showMainland = (typeof mainlandFade !== 'undefined')
            ? (mainlandFade.alpha > 0.004)
            : (activeProject === 'sakhalin1' || activeProject === 'shv');
        const show3DFE = camDist < 205 * mobileMult;
        s1TaigaMesh.visible = showMainland && show3DFE;
        s1TaigaPoints.visible = showMainland && !show3DFE;
    }
}

function buildSakhalinTaiga() {
    const maxTrees = 1150;
    const treeGeo = new THREE.ConeGeometry(0.24, 0.72, 5);
    treeGeo.translate(0, 0.36, 0);
    const treeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.02,
        vertexColors: false
    });

    taigaMesh = new THREE.InstancedMesh(treeGeo, treeMat, maxTrees);
    taigaMesh.castShadow = false;
    taigaMesh.receiveShadow = true;

    const avoidPoints = [];
    FACILITIES_DATA.forEach(f => {
        if (f.category === 'onshore' && f.position) {
            avoidPoints.push([f.position.x, f.position.z, 2.8]);
        }
    });
    SAKHALIN1_FACILITIES_DATA.forEach(f => {
        if ((f.category === 'onshore' || f.id === 's1-odoptu') && f.geoLonLat) {
            const [sx, sz] = lonLatToXZ(f.geoLonLat[0], f.geoLonLat[1]);
            avoidPoints.push([sx, sz, f.id === 's1-chayvo' ? 3.6 : 2.6]);
        }
    });
    CITIES_DATA.forEach(c => {
        if (!c.isIsland) {
            const [cx, cz] = lonLatToXZ(c.geoLonLat[0], c.geoLonLat[1]);
            avoidPoints.push([cx, cz, 2.4]);
        }
    });

    let seed = 48271;
    function nextRand() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    }

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;
    let attempts = 0;

    while (placed < maxTrees && attempts < 14000) {
        attempts++;
        const tx = ISLAND_AABB.minX + nextRand() * (ISLAND_AABB.maxX - ISLAND_AABB.minX);
        const tz = ISLAND_AABB.minZ + nextRand() * (ISLAND_AABB.maxZ - ISLAND_AABB.minZ);

        if (!isPointInPolygon(tx, tz, SAKHALIN_OUTLINE)) continue;
        const shoreDist = distanceToShoreline(tx, tz, SAKHALIN_OUTLINE);
        if (shoreDist < 0.85) continue;

        const elev = getSakhalinElevation(tx, tz);
        if (elev < 0.35 || elev > 2.45) continue;

        let blocked = false;
        for (let a = 0; a < avoidPoints.length; a++) {
            const dx = tx - avoidPoints[a][0];
            const dz = tz - avoidPoints[a][1];
            if (dx * dx + dz * dz < avoidPoints[a][2] * avoidPoints[a][2]) {
                blocked = true;
                break;
            }
        }
        if (blocked) continue;

        for (let p = 0; p < pipelineExclusionPts.length; p++) {
            const dx = tx - pipelineExclusionPts[p][0];
            const dz = tz - pipelineExclusionPts[p][1];
            if (dx * dx + dz * dz < 1.35 * 1.35) {
                blocked = true;
                break;
            }
        }
        if (blocked) continue;

        const scale = 0.72 + nextRand() * 0.65;
        dummy.position.set(tx, elev - 0.04, tz);
        dummy.rotation.y = nextRand() * Math.PI * 2;
        dummy.scale.set(scale, scale * (0.9 + nextRand() * 0.35), scale);
        dummy.updateMatrix();
        taigaMesh.setMatrixAt(placed, dummy.matrix);

        const tone = 0.75 + nextRand() * 0.35;
        color.setRGB(0.09 * tone, 0.30 * tone, 0.16 * tone);
        taigaMesh.setColorAt(placed, color);
        placed++;
    }

    taigaMesh.count = placed;
    taigaMesh.instanceMatrix.needsUpdate = true;
    if (taigaMesh.instanceColor) taigaMesh.instanceColor.needsUpdate = true;
    scene.add(taigaMesh);
    taigaPoints = createTaigaPointsFromInstanced(taigaMesh, 1.05);
    scene.add(taigaPoints);
    updateTaigaPointsTint();
}

function getNightGlowTexture() {
    if (nightGlowTex) return nightGlowTex;
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(255, 250, 218, 1.0)');
    grad.addColorStop(0.24, 'rgba(253, 212, 86, 0.84)');
    grad.addColorStop(0.56, 'rgba(245, 130, 32, 0.34)');
    grad.addColorStop(1.0, 'rgba(234, 88, 12, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    nightGlowTex = new THREE.CanvasTexture(canvas);
    return nightGlowTex;
}

function buildSakhalinNightHalos() {
    s2NightHalosGroup = new THREE.Group();
    s2NightHalosGroup.visible = false;
    s2NightHalosMat = new THREE.MeshBasicMaterial({
        map: getNightGlowTexture(),
        color: 0xffe092,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false
    });

    const haloSpots = [
        { lon: 142.73, lat: 46.96, size: 8.4 }, // Южно-Сахалинск
        { lon: 142.62, lat: 46.72, size: 5.5 }, // Корсаков
        { lon: 142.82, lat: 46.72, size: 5.8 }, // Завод СПГ
        { lon: 143.15, lat: 46.54, size: 4.8 }, // ТОН
        { lon: 142.05, lat: 47.04, size: 5.0 }, // Холмск
        { lon: 143.08, lat: 49.22, size: 4.8 }, // Поронайск
        { lon: 142.06, lat: 49.15, size: 4.2 }, // Шахтёрск
        { lon: 142.16, lat: 50.90, size: 4.2 }, // Александровск-Сахалинский
        { lon: 143.12, lat: 51.82, size: 4.8 }, // Ноглики
        { lon: 143.00, lat: 51.68, size: 5.0 }, // ОБТК
        { lon: 142.93, lat: 53.58, size: 4.8 }  // Оха
    ];

    const planeGeo = new THREE.PlaneGeometry(1, 1);
    planeGeo.rotateX(-Math.PI / 2);

    haloSpots.forEach(h => {
        const [hx, hz] = lonLatToXZ(h.lon, h.lat);
        const hy = Math.max(0.45, getSakhalinElevation(hx, hz)) + 0.95;
        const m = new THREE.Mesh(planeGeo, s2NightHalosMat);
        m.scale.set(h.size, 1, h.size);
        m.position.set(hx, hy, hz);
        m.renderOrder = 18;
        s2NightHalosGroup.add(m);
    });
    scene.add(s2NightHalosGroup);
}

function buildFarEastNightAtmosphere() {
    s1NightHalosGroup = new THREE.Group();
    s1NightHalosGroup.visible = nightMix > 0.03;
    s1NightHalosMat = new THREE.MeshBasicMaterial({
        map: getNightGlowTexture(),
        color: 0xffe092,
        transparent: true,
        opacity: nightMix * 0.88,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false
    });

    const planeGeo = new THREE.PlaneGeometry(1, 1);
    planeGeo.rotateX(-Math.PI / 2);

    // Тёплые ореолы всех городов Дальнего Востока РФ и соседних стран (depthTest: false — рельеф не режет и не смещает свет!)
    const farEastHalos = [
        { lon: 135.08, lat: 48.48, size: 19.5 }, // Хабаровск
        { lon: 131.88, lat: 43.12, size: 20.0 }, // Владивосток
        { lon: 137.01, lat: 50.55, size: 14.0 }, // Комсомольск-на-Амуре
        { lon: 127.53, lat: 50.29, size: 14.0 }, // Благовещенск
        { lon: 132.89, lat: 42.82, size: 11.8 }, // Находка
        { lon: 131.95, lat: 43.80, size: 11.5 }, // Уссурийск
        { lon: 133.72, lat: 45.93, size: 9.2  }, // Дальнереченск
        { lon: 140.28, lat: 48.97, size: 9.2  }, // Советская Гавань
        { lon: 140.72, lat: 53.14, size: 8.8  }, // Николаевск-на-Амуре
        { lon: 140.78, lat: 51.47, size: 9.2  }, // Де-Кастри
        { lon: 143.02, lat: 52.40, size: 9.5  }, // Чайво / Ястреб
        { lon: 132.92, lat: 48.79, size: 10.2 }, // Биробиджан
        { lon: 128.48, lat: 50.92, size: 9.0  }, // Белогорск
        { lon: 128.14, lat: 51.38, size: 9.0  }, // Свободный
        { lon: 143.20, lat: 59.36, size: 8.0  }, // Охотск
        { lon: 138.17, lat: 56.45, size: 7.4  }, // Аян
        { lon: 150.80, lat: 59.56, size: 12.0 }, // Магадан
        { lon: 129.73, lat: 62.03, size: 13.0 }, // Якутск
        // Крупные города соседей (мягкий свет, чтобы Китай, Корея и Япония красиво читались ночью)
        { lon: 126.64, lat: 45.75, size: 19.5 }, // Харбин
        { lon: 125.32, lat: 43.89, size: 17.5 }, // Чанчунь
        { lon: 123.43, lat: 41.80, size: 18.0 }, // Шэньян
        { lon: 125.76, lat: 39.03, size: 13.5 }, // Пхеньян
        { lon: 141.35, lat: 43.06, size: 17.5 }, // Саппоро
        { lon: 140.73, lat: 41.77, size: 11.0 }, // Хакодате
        { lon: 140.74, lat: 40.82, size: 11.5 }, // Аомори
        { lon: 140.87, lat: 38.27, size: 16.5 }  // Сэндай
    ];

    farEastHalos.forEach(h => {
        const [hx, hz] = lonLatToXZ(h.lon, h.lat);
        const hy = Math.max(0.45, getAnyLandElevation(hx, hz) + 0.95);
        const m = new THREE.Mesh(planeGeo, s1NightHalosMat);
        m.scale.set(h.size, 1, h.size);
        m.position.set(hx, hy, hz);
        m.renderOrder = 18;
        s1NightHalosGroup.add(m);
    });
    sakhalin1Group.add(s1NightHalosGroup);

    // Точечные ночные россыпи огней в городах Китая, Японии, Кореи, Магадана и Якутска
    s1NeighborLightsGroup = new THREE.Group();
    s1NeighborLightsGroup.visible = nightMix > 0.03;
    s1NeighborLightsMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: nightMix * 0.90
    });

    const neighborHubs = [
        { lon: 126.64, lat: 45.75, cnt: 14, spr: 3.2 }, // Харбин
        { lon: 125.32, lat: 43.89, cnt: 11, spr: 2.7 }, // Чанчунь
        { lon: 123.43, lat: 41.80, cnt: 12, spr: 2.8 }, // Шэньян
        { lon: 125.76, lat: 39.03, cnt: 8,  spr: 2.0 }, // Пхеньян
        { lon: 141.35, lat: 43.06, cnt: 12, spr: 2.6 }, // Саппоро
        { lon: 140.73, lat: 41.77, cnt: 7,  spr: 1.7 }, // Хакодате
        { lon: 140.87, lat: 38.27, cnt: 11, spr: 2.6 }, // Сэндай
        { lon: 150.80, lat: 59.56, cnt: 8,  spr: 1.8 }, // Магадан
        { lon: 129.73, lat: 62.03, cnt: 9,  spr: 2.1 }  // Якутск
    ];

    const dotGeo = new THREE.BoxGeometry(0.40, 0.22, 0.40);
    neighborHubs.forEach((hub, idx) => {
        const [cx, cz] = lonLatToXZ(hub.lon, hub.lat);
        for (let k = 0; k < hub.cnt; k++) {
            const ang = (k / hub.cnt) * Math.PI * 2 + idx * 0.8;
            const dst = k === 0 ? 0 : hub.spr * (0.35 + ((k * 29) % 10) * 0.065);
            const lx = cx + Math.cos(ang) * dst;
            const lz = cz + Math.sin(ang) * dst;
            const ly = Math.max(0.48, getAnyLandElevation(lx, lz) + 0.28);
            const blk = new THREE.Mesh(dotGeo, s1NeighborLightsMat);
            blk.position.set(lx, ly, lz);
            s1NeighborLightsGroup.add(blk);
        }
    });
    sakhalin1Group.add(s1NeighborLightsGroup);
}

function updateNightAtmosphere() {
    const show = nightMix > 0.03;
    const showMainland = (typeof activeProject !== 'undefined') && (activeProject === 'sakhalin1' || activeProject === 'shv');
    const s1A = (typeof projectCrossfade !== 'undefined') ? projectCrossfade.s1Alpha : (showMainland ? 1 : 0);
    const mlA = (typeof mainlandFade !== 'undefined') ? mainlandFade.alpha : (showMainland ? 1 : 0);
    const effFE = s1A * mlA;
    const showFarEastLights = show && effFE > 0.02;

    if (s2NightHalosGroup && s2NightHalosMat) {
        s2NightHalosGroup.visible = show;
        s2NightHalosMat.opacity = nightMix * 0.84;
    }
    if (sakhalin1Built && s1NightHalosGroup && s1NightHalosMat) {
        s1NightHalosGroup.visible = showFarEastLights;
        s1NightHalosMat.opacity = nightMix * 0.88 * effFE;
    }
    if (sakhalin1Built && s1NeighborLightsGroup && s1NeighborLightsMat) {
        s1NeighborLightsGroup.visible = showFarEastLights;
        s1NeighborLightsMat.opacity = nightMix * 0.90 * effFE;
    }
    // Мягкое свечение трубопроводов ночью, когда не выделена отдельная ветка
    if (!activeFacilityId) {
        for (let i = 0; i < pipelineSegments.length; i++) {
            pipelineSegments[i].mat.emissiveIntensity = 0.08 + nightMix * 0.34;
        }
        if (sakhalin1Built) {
            for (let i = 0; i < s1PipelineSegments.length; i++) {
                s1PipelineSegments[i].mat.emissiveIntensity = 0.18 + nightMix * 0.42;
            }
        }
    }
}

function buildCityLights() {
    cityLightsGroup = new THREE.Group();
    cityLightsGroup.visible = false;
    scene.add(cityLightsGroup);

    cityLightsMat = new THREE.MeshBasicMaterial({
        color: 0xfde68a,
        transparent: true,
        opacity: 0.0
    });
    const blockGeo = new THREE.BoxGeometry(0.22, 0.14, 0.22);

    CITIES_DATA.forEach((city, idx) => {
        if (city.isIsland) return;
        const [cx, cz] = lonLatToXZ(city.geoLonLat[0], city.geoLonLat[1]);
        const isMajor = city.name === 'Южно-Сахалинск' || city.name === 'Корсаков' || city.name === 'Холмск';
        const count = isMajor ? 10 : 5;
        const spread = isMajor ? 1.35 : 0.75;

        for (let k = 0; k < count; k++) {
            const angle = (k / count) * Math.PI * 2 + idx * 0.7;
            const dist = k === 0 ? 0 : spread * (0.4 + ((k * 37) % 10) * 0.06);
            const lx = cx + Math.cos(angle) * dist;
            const lz = cz + Math.sin(angle) * dist;
            const ly = Math.max(0.32, getSakhalinElevation(lx, lz)) + 0.08;

            const block = new THREE.Mesh(blockGeo, cityLightsMat);
            block.position.set(lx, ly, lz);
            cityLightsGroup.add(block);
        }
    });
}

function buildSupplyHelicopter() {
    const heliGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35, metalness: 0.2 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const rotorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

    const fuselage = new THREE.Mesh(createCapsuleGeometry(0.18, 0.46, 8), bodyMat);
    fuselage.rotation.x = Math.PI / 2;
    heliGroup.add(fuselage);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.08, 0.44), stripeMat);
    heliGroup.add(stripe);

    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), glassMat);
    cockpit.position.set(0, 0.02, 0.24);
    heliGroup.add(cockpit);

    const tailBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.56, 6), bodyMat);
    tailBoom.rotation.x = Math.PI / 2;
    tailBoom.position.set(0, 0.04, -0.46);
    heliGroup.add(tailBoom);

    const mainRotor = new THREE.Group();
    mainRotor.position.set(0, 0.22, 0.02);
    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.015, 0.055), rotorMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.015, 1.18), rotorMat);
    mainRotor.add(blade1, blade2);
    heliGroup.add(mainRotor);

    const tailRotor = new THREE.Group();
    tailRotor.position.set(0.07, 0.07, -0.72);
    const tBlade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.26, 0.035), rotorMat);
    tailRotor.add(tBlade);
    heliGroup.add(tailRotor);

    const strobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    strobe.position.set(0, -0.18, 0.05);
    heliGroup.add(strobe);
    platformBeacons.push({ mesh: strobe, phase: 0.3 });

    sakhalin2Group.add(heliGroup);

    const obtkPad = lonLatToVec3(143.00, 51.68, 1.55);
    const lunPad = lonLatToVec3(143.78, 51.68, 2.35);
    const paaPad = lonLatToVec3(143.65, 52.71, 2.18);
    const pabPad = lonLatToVec3(143.62, 53.02, 2.35);

    const mid1 = new THREE.Vector3().lerpVectors(obtkPad, lunPad, 0.5).add(new THREE.Vector3(0, 2.4, 0));
    const mid2 = new THREE.Vector3().lerpVectors(lunPad, paaPad, 0.5).add(new THREE.Vector3(1.5, 2.8, 0));
    const mid3 = new THREE.Vector3().lerpVectors(paaPad, pabPad, 0.5).add(new THREE.Vector3(0.8, 1.6, 0));
    const mid4 = new THREE.Vector3().lerpVectors(pabPad, obtkPad, 0.5).add(new THREE.Vector3(-2.5, 3.2, 0));

    const heliCurve = new THREE.CatmullRomCurve3(
        [obtkPad, mid1, lunPad, mid2, paaPad, mid3, pabPad, mid4],
        true,
        'centripetal'
    );

    const padCoords = [obtkPad, lunPad, paaPad, pabPad];
    const heliStops = padCoords.map((padVec, idx) => {
        let bestT = 0;
        let bestDistSq = Infinity;
        for (let k = 0; k < 240; k++) {
            const tt = k / 240;
            const pt = heliCurve.getPointAt(tt);
            const dSq = pt.distanceToSquared(padVec);
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                bestT = tt;
            }
        }
        return { t: bestT, duration: idx === 0 ? 4.2 : 3.4 };
    }).sort((a, b) => a.t - b.t);

    supplyHelicopter = {
        group: heliGroup,
        mainRotor,
        tailRotor,
        curve: heliCurve,
        stops: heliStops,
        nextStopIndex: 1,
        t: heliStops[0].t,
        speed: 0.032,
        speedFactor: 1.0,
        state: 'flying',
        hoverTimer: 0
    };
}

