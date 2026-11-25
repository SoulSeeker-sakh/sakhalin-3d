'use strict';

// =========================================================================
// [BLOCK:PIPELINES_S2]
// 7. ТРАССА ТРУБОПРОВОДА (УЗЛЫ I, II, III ПО ОФИЦИАЛЬНОЙ СХЕМЕ + ВПУ)
// =========================================================================
function sanitizeXZList(xzList, minDist = 0.06) {
    if (!Array.isArray(xzList) || xzList.length === 0) return [];
    const out = [];
    for (let i = 0; i < xzList.length; i++) {
        const p = xzList[i];
        if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
        if (out.length === 0) {
            out.push([p[0], p[1]]);
        } else {
            const prev = out[out.length - 1];
            if (Math.hypot(p[0] - prev[0], p[1] - prev[1]) >= minDist) {
                out.push([p[0], p[1]]);
            }
        }
    }
    return out;
}

function sanitizeVec3List(vecList, minDist = 0.06) {
    if (!Array.isArray(vecList) || vecList.length === 0) return [];
    const out = [];
    for (let i = 0; i < vecList.length; i++) {
        const v = vecList[i];
        if (!v || !Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) continue;
        if (out.length === 0 || v.distanceTo(out[out.length - 1]) >= minDist) {
            out.push(v);
        }
    }
    return out;
}

function buildPipelines() {
    pipelineSegments = [];
    pipelineFlowParticles = [];
    pipelineExclusionPts = [];

    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const PIPE_OFFSET = 0.23;

    const tonXZRef = lonLatToXZ(143.15, 46.54);
    const pierNorthZ = tonXZRef[1] - 4.2;
    const pierSouthZ = tonXZRef[1] + 0.9;

    function createOilMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x22c55e,
            emissive: 0x15803d,
            emissiveIntensity: 0.12,
            roughness: 0.34,
            metalness: 0.35,
            transparent: true,
            opacity: 1.0
        });
    }

    function createGasMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.08,
            roughness: 0.34,
            metalness: 0.35,
            transparent: true,
            opacity: 1.0
        });
    }

    function buildFilletedCenterline(xzPoints, cornerRadius = 1.45, stepLen = 0.8) {
        const cleanInput = sanitizeXZList(xzPoints, 0.06);
        if (cleanInput.length < 2) return cleanInput;

        const rawPts = [];
        function pushSubdivided(a, b) {
            const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (dist < 0.05) return;
            const steps = Math.max(1, Math.ceil(dist / stepLen));
            for (let s = 0; s <= steps; s++) {
                if (rawPts.length > 0 && s === 0) continue;
                const t = s / steps;
                rawPts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            }
        }

        if (cleanInput.length === 2) {
            pushSubdivided(cleanInput[0], cleanInput[1]);
        } else {
            let cursor = cleanInput[0];
            for (let i = 1; i < cleanInput.length - 1; i++) {
                const A = cleanInput[i - 1];
                const B = cleanInput[i];
                const C = cleanInput[i + 1];

                const v1x = A[0] - B[0], v1z = A[1] - B[1];
                const v2x = C[0] - B[0], v2z = C[1] - B[1];
                const len1 = Math.hypot(v1x, v1z);
                const len2 = Math.hypot(v2x, v2z);

                if (len1 < 0.06 || len2 < 0.06) continue;

                const r = Math.min(cornerRadius, len1 * 0.42, len2 * 0.42);
                const pStart = [B[0] + (v1x / len1) * r, B[1] + (v1z / len1) * r];
                const pEnd = [B[0] + (v2x / len2) * r, B[1] + (v2z / len2) * r];

                pushSubdivided(cursor, pStart);

                const arcSteps = 7;
                for (let k = 1; k <= arcSteps; k++) {
                    const t = k / arcSteps;
                    const mt = 1 - t;
                    const qx = mt * mt * pStart[0] + 2 * mt * t * B[0] + t * t * pEnd[0];
                    const qz = mt * mt * pStart[1] + 2 * mt * t * B[1] + t * t * pEnd[1];
                    rawPts.push([qx, qz]);
                }
                cursor = pEnd;
            }
            pushSubdivided(cursor, cleanInput[cleanInput.length - 1]);
        }

        return sanitizeXZList(rawPts, 0.06);
    }

    function samplePipeElevation(x, z, elevateOverPier = false) {
        const hC = getSakhalinElevation(x, z);
        const h1 = getSakhalinElevation(x + 0.24, z);
        const h2 = getSakhalinElevation(x - 0.24, z);
        const h3 = getSakhalinElevation(x, z + 0.24);
        const h4 = getSakhalinElevation(x, z - 0.24);
        const maxTerrain = Math.max(hC, h1, h2, h3, h4, 0);
        let y = maxTerrain + 0.22;

        if (elevateOverPier && Math.abs(x - (tonXZRef[0] - 0.16)) < 1.35 && z >= pierNorthZ && z <= pierSouthZ) {
            y = Math.max(y, 0.52);
        }
        return y;
    }

    function createTubeFromXZ(xzList, mat, chainTag, phaseShift = 0.0, radius = 0.105, isSubsea = false, elevateOverPier = false) {
        const cleanXZ = sanitizeXZList(xzList, 0.06);
        if (cleanXZ.length < 2) return null;

        for (let k = 0; k < cleanXZ.length; k += 2) {
            pipelineExclusionPts.push(cleanXZ[k]);
        }

        const vec3Pts = sanitizeVec3List(
            cleanXZ.map(([x, z]) => new THREE.Vector3(x, isSubsea ? 0.18 : samplePipeElevation(x, z, elevateOverPier), z)),
            0.06
        );
        if (vec3Pts.length < 2) return null;

        const curve = new THREE.CatmullRomCurve3(vec3Pts, false, 'centripetal');
        const len = curve.getLength();
        if (!Number.isFinite(len) || len < 0.08) return null;

        const tubularSegments = Math.min(300, Math.max(16, Math.ceil(len * 2.2)));
        const tube = new THREE.Mesh(
            new THREE.TubeGeometry(curve, tubularSegments, radius, 7, false),
            mat
        );
        tube.castShadow = true;
        sakhalin2Group.add(tube);
        pipelineSegments.push({ mesh: tube, mat, chainTag });

        const pulseCount = Math.max(2, Math.floor(len / 17));
        for (let p = 0; p < pulseCount; p++) {
            const dot = new THREE.Mesh(new THREE.SphereGeometry(0.168, 7, 7), pulseMat);
            dot.visible = isFlowEnabled;
            sakhalin2Group.add(dot);
            pipelineFlowParticles.push({
                mesh: dot,
                curve,
                chainTag,
                t: (p + phaseShift) / pulseCount,
                speed: 0.16 / Math.max(10, len * 0.16)
            });
        }
        return curve;
    }

    function addDualRoute(lonLatPoints, options = {}) {
        const cornerRadius = options.cornerRadius !== undefined ? options.cornerRadius : 1.45;
        const oilSide = options.oilSide !== undefined ? options.oilSide : 1;
        const offset = options.offset !== undefined ? options.offset : PIPE_OFFSET;
        const oilTag = options.oilTag || 'oil-trunk';
        const gasTag = options.gasTag || 'gas-trunk';

        const xzPoints = lonLatPoints.map(([lon, lat]) => lonLatToXZ(lon, lat));
        const centerPts = buildFilletedCenterline(xzPoints, cornerRadius, 0.8);
        if (centerPts.length < 2) return null;

        const oilXZ = [];
        const gasXZ = [];

        for (let i = 0; i < centerPts.length; i++) {
            const prev = centerPts[Math.max(0, i - 1)];
            const next = centerPts[Math.min(centerPts.length - 1, i + 1)];
            const dx = next[0] - prev[0];
            const dz = next[1] - prev[1];
            const segLen = Math.hypot(dx, dz);
            if (segLen < 1e-5) continue;

            const lx = dz / segLen;
            const lz = -dx / segLen;

            const px = centerPts[i][0];
            const pz = centerPts[i][1];

            oilXZ.push([px + lx * offset * oilSide, pz + lz * offset * oilSide]);
            gasXZ.push([px - lx * offset * oilSide, pz - lz * offset * oilSide]);
        }

        createTubeFromXZ(oilXZ, createOilMaterial(), oilTag, 0.5);
        createTubeFromXZ(gasXZ, createGasMaterial(), gasTag, 0.0);

        return {
            startOil: oilXZ[0],
            startGas: gasXZ[0],
            endOil: oilXZ[oilXZ.length - 1],
            endGas: gasXZ[gasXZ.length - 1]
        };
    }

    function addSingleRouteXZ(xzPoints, mat, chainTag, cornerRadius = 1.2, phaseShift = 0.0, isSubsea = false, elevateOverPier = false) {
        const centerPts = buildFilletedCenterline(xzPoints, cornerRadius, 0.7);
        createTubeFromXZ(centerPts, mat, chainTag, phaseShift, 0.105, isSubsea, elevateOverPier);
    }

    function buildSpmBuoy3D(vpuXZ) {
        const buoyGroup = new THREE.Group();
        buoyGroup.position.set(vpuXZ[0], 0.08, vpuXZ[1]);

        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.25 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
        const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
        const hoseMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });

        const lowerHull = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 0.26, 16), yellowMat);
        lowerHull.position.y = 0.12;
        lowerHull.castShadow = true;
        buoyGroup.add(lowerHull);

        const whiteBand = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.14, 16), whiteMat);
        whiteBand.position.y = 0.31;
        buoyGroup.add(whiteBand);

        const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.22, 12), yellowMat);
        turret.position.y = 0.48;
        buoyGroup.add(turret);

        const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 10, 10),
            new THREE.MeshBasicMaterial({ color: 0xfef08a })
        );
        beacon.position.y = 0.68;
        buoyGroup.add(beacon);

        const fender = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.055, 8, 18), darkMat);
        fender.rotation.x = Math.PI / 2;
        fender.position.y = 0.18;
        buoyGroup.add(fender);

        const hosePts = sanitizeVec3List([
            new THREE.Vector3(0.0, 0.16, 0.42),
            new THREE.Vector3(0.32, 0.12, 0.92),
            new THREE.Vector3(0.08, 0.10, 1.48),
            new THREE.Vector3(-0.22, 0.10, 1.95)
        ], 0.05);

        if (hosePts.length >= 2) {
            const hoseCurve = new THREE.CatmullRomCurve3(hosePts);
            const hoseMesh = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 18, 0.055, 6, false), hoseMat);
            buoyGroup.add(hoseMesh);
        }

        sakhalin2Group.add(buoyGroup);
    }

    // УЗЕЛ I — СЕВЕРНЫЙ ШЕЛЬФ
    const TRUNK_LON = 144.07;
    addDualRoute([
        [143.62, 53.02],
        [TRUNK_LON, 53.02],
        [TRUNK_LON, 52.71],
        [TRUNK_LON, 52.42],
        [143.14, 52.42],
        [143.04, 52.28]
    ], { cornerRadius: 1.65, oilSide: 1, oilTag: 'oil-north', gasTag: 'gas-north' });

    const paAXZ = lonLatToXZ(143.65, 52.71);
    const paAJuncXZ = lonLatToXZ(TRUNK_LON, 52.71);
    addSingleRouteXZ([
        [paAXZ[0], paAXZ[1] - PIPE_OFFSET],
        [paAJuncXZ[0] + PIPE_OFFSET, paAJuncXZ[1] - PIPE_OFFSET]
    ], createOilMaterial(), 'oil-north', 0.35, 0.5);
    addSingleRouteXZ([
        [paAXZ[0], paAXZ[1] + PIPE_OFFSET],
        [paAJuncXZ[0] - PIPE_OFFSET, paAJuncXZ[1] + PIPE_OFFSET]
    ], createGasMaterial(), 'gas-north', 0.35, 0.0);

    // УЗЕЛ II — УОУГ (Сев.) -> ОБТК + ЛУН-А -> ОБТК -> ЮГ ОСТРОВА
    addDualRoute([
        [143.04, 52.28],
        [142.82, 52.00],
        [142.84, 51.80],
        [143.00, 51.68]
    ], { cornerRadius: 1.55, oilSide: 1, oilTag: 'oil-north', gasTag: 'gas-north' });

    addDualRoute([
        [143.78, 51.68],
        [143.00, 51.68]
    ], { cornerRadius: 0.7, oilSide: -1, oilTag: 'gas-lun', gasTag: 'gas-lun' });

    const mainTrunk = addDualRoute([
        [143.00, 51.68],
        [142.78, 51.56],
        [142.70, 51.30],
        [142.72, 50.65],
        [142.78, 49.95],
        [142.84, 49.25],
        [142.70, 48.72],
        [142.55, 48.05],
        [142.66, 47.60],
        [142.76, 47.25],
        [142.82, 46.96],
        [142.86, 46.81]
    ], { cornerRadius: 1.7, oilSide: 1, oilTag: 'oil-trunk', gasTag: 'gas-trunk' });

    // УЗЕЛ III — ЕДИНЫЙ ПК «ПРИГОРОДНОЕ» (ЗАВОД СПГ + БЕРЕГОВОЙ ТОН -> БАШНЯ ВПУ ПРАВЕЕ В ЗАЛИВЕ АНИВА)
    if (mainTrunk) {
        const [prigX, prigZ] = lonLatToXZ(142.96, 46.66);
        const lngEntryXZ = [prigX - 1.35, prigZ - 0.35];
        const tonWingXZ  = [prigX + 1.35, prigZ - 0.10];
        const spmXZ      = lonLatToXZ(143.18, 46.34);

        addSingleRouteXZ([
            mainTrunk.endGas,
            [prigX - 1.35, prigZ - 1.75],
            lngEntryXZ
        ], createGasMaterial(), 'gas-lng', 1.2, 0.0);

        addSingleRouteXZ([
            mainTrunk.endOil,
            [prigX + 0.85, prigZ - 1.55],
            tonWingXZ
        ], createOilMaterial(), 'oil-ton', 1.35, 0.5, false, false);

        addSingleRouteXZ([
            tonWingXZ,
            [tonWingXZ[0] * 0.48 + spmXZ[0] * 0.52, tonWingXZ[1] * 0.48 + spmXZ[1] * 0.52],
            spmXZ
        ], createOilMaterial(), 'oil-ton', 0.8, 0.25, true, false);
    }
}

