'use strict';

// =========================================================================
// [BLOCK:FACILITIES_S2]
// 8. СБОРКА ОБЪЕКТОВ «САХАЛИН-2» И DOM-МАРКЕРОВ
// =========================================================================
// Вспомогательная геометрия кольца выбора, плавно повторяющая 3D-рельеф склонов (никогда не тонет в земле!)
function createTerrainConformingRingGeo(cx, cz, baseY, innerR, outerR, segs, elevFn, minLocalY = 0.14) {
    const geo = new THREE.RingGeometry(innerR, outerR, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const lx = pos.getX(i);
        const lz = pos.getZ(i);
        const groundH = Math.max(0.06, elevFn(cx + lx, cz + lz));
        const localY = Math.max(minLocalY, groundH + 0.16 - baseY);
        pos.setY(i, localY);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
}

function buildFacilitiesAndShips() {
    const ringGeo = new THREE.RingGeometry(1.15, 1.48, 28);
    ringGeo.rotateX(-Math.PI / 2);

    FACILITIES_DATA.forEach(fac => {
        const group = new THREE.Group();
        group.userData.tag = fac.id;
        fac.position = lonLatToVec3(fac.geoLonLat[0], fac.geoLonLat[1], 0.06);

        if (fac.id === 'lng-plant') {
            // Единый монолитный ПК «Пригородное»: сдвигаем чуть ближе к кромке воды и ставим в «золотую середину» высоты,
            // чтобы задние резервуары не тонули в склоне, а с моря площадка не торчала высокой стеной
            fac.position.z += 0.55;
            const backElev = getSiteMaxElevation(fac.position.x, fac.position.z - 0.65, 1.35);
            const centerElev = getSakhalinElevation(fac.position.x, fac.position.z);
            fac.position.y = Math.max(0.58, Math.min(1.02, Math.max(centerElev + 0.24, backElev - 0.06)));
            s2Runtime.lngBerthPos = new THREE.Vector3(fac.position.x - 1.10, 0.15, fac.position.z + 1.25 + 4.95 + 0.45);
            s2Runtime.oldLngBerthPos = s2Runtime.lngBerthPos.clone();
        } else if (fac.category === 'onshore') {
            const siteRadius = fac.id === 'obtk' ? 1.3 : 1.1;
            fac.position.y = getSiteMaxElevation(fac.position.x, fac.position.z, siteRadius);
        } else {
            fac.position.y = 0.06;
        }

        group.position.copy(fac.position);

        if (fac.id === 'pa-b') {
            buildGravityPlatform3D(group, false);
        } else if (fac.id === 'pa-a') {
            buildMolikpaq3D(group);
        } else if (fac.id === 'lun-a') {
            buildGravityPlatform3D(group, true);
        } else if (fac.id === 'obtk') {
            buildOnshoreComplex3D(group, true);
        } else if (fac.id === 'nks-2') {
            buildOnshoreComplex3D(group, false);
        } else if (fac.id === 'uoug-north' || fac.id === 'uoug-south') {
            buildValveStation3D(group);
        } else if (fac.id === 'lng-plant') {
            buildLngPlant3D(group);
        } else if (fac.id === 'aniva-lighthouse') {
            buildAnivaLighthouse3D(group);
        } else if (fac.isMovingShip) {
            buildVessel3D(group, fac.shipType);
        }

        const ringMat = new THREE.MeshBasicMaterial({
            color: fac.markerColor,
            transparent: true,
            opacity: 0.48,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -2
        });
        let useRingGeo = ringGeo;
        let ringY = 0.16;
        if (fac.id === 'lng-plant') {
            useRingGeo = createTerrainConformingRingGeo(fac.position.x, fac.position.z, fac.position.y, 2.85, 3.22, 40, getSakhalinElevation, 0.18);
            ringY = 0.0;
        } else if (fac.category === 'onshore') {
            useRingGeo = createTerrainConformingRingGeo(fac.position.x, fac.position.z, fac.position.y, 1.15, 1.48, 32, getSakhalinElevation, 0.14);
            ringY = 0.0;
        }
        const selectionRing = new THREE.Mesh(useRingGeo, ringMat);
        selectionRing.position.y = ringY;
        group.add(selectionRing);

        const hitRadius = (fac.id === 'lng-plant') ? 3.1 : 1.75;
        const hitbox = new THREE.Mesh(
            new THREE.CylinderGeometry(hitRadius, hitRadius, 3.2, 10),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        hitbox.position.y = 1.4;
        hitbox.userData.facilityId = fac.id;
        hitbox.userData.category = fac.category;
        group.add(hitbox);
        clickableObjects.push(hitbox);

        // Маяк Анива оставляем на мысе как исторический ориентир острова, а всю инфраструктуру «Сахалин-2» изолируем в sakhalin2Group
        if (fac.id === 'aniva-lighthouse') {
            scene.add(group);
        } else {
            sakhalin2Group.add(group);
        }
        facilityModelsMap.set(fac.id, { group, selectionRing });

        if (fac.isMovingShip && fac.routeWaypoints) {
            const curvePts = sanitizeVec3List(
                fac.routeWaypoints.map(([lon, lat]) => lonLatToVec3(lon, lat, 0.06)),
                0.1
            );
            if (curvePts.length >= 3) {
                const shipCurve = new THREE.CatmullRomCurve3(curvePts, false, 'centripetal');

                const routeSampled = shipCurve.getPoints(120).map(p => new THREE.Vector3(p.x, 0.11, p.z));
                const routeGeo = new THREE.BufferGeometry().setFromPoints(routeSampled);
                const routeMat = new THREE.LineDashedMaterial({
                    color: fac.routeColor || 0x38bdf8,
                    dashSize: 1.2,
                    gapSize: 0.9,
                    transparent: true,
                    opacity: 0.28
                });
                const routeLine = new THREE.Line(routeGeo, routeMat);
                routeLine.computeLineDistances();
                sakhalin2Group.add(routeLine);

                const stops = (fac.dockStops || []).map(ds => {
                    const stopVec = lonLatToVec3(ds.lonLat[0], ds.lonLat[1], 0.06);
                    let bestT = 0;
                    let bestDistSq = Infinity;
                    for (let k = 0; k < 200; k++) {
                        const tt = k / 200;
                        const pt = shipCurve.getPointAt(tt);
                        const dSq = pt.distanceToSquared(stopVec);
                        if (dSq < bestDistSq) {
                            bestDistSq = dSq;
                            bestT = tt;
                        }
                    }
                    return {
                        t: bestT,
                        targetPos: lonLatToVec3(ds.targetLonLat[0], ds.targetLonLat[1], ds.targetY || 0.5),
                        duration: ds.duration || 6.0,
                        color: ds.color || 0xfacc15,
                        phaseLabel: ds.phaseLabel || 'Стоянка',
                        statusText: ds.statusText || 'Операция у причала'
                    };
                }).sort((a, b) => a.t - b.t);

                const transferGroup = new THREE.Group();
                transferGroup.visible = false;
                const tLineGeo = new THREE.BufferGeometry();
                tLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
                const tLineMat = new THREE.LineBasicMaterial({
                    color: fac.routeColor || 0xfacc15,
                    transparent: true,
                    opacity: 0.85
                });
                const transferLine = new THREE.Line(tLineGeo, tLineMat);
                transferGroup.add(transferLine);

                const transferPulses = [];
                const pMat = new THREE.MeshBasicMaterial({ color: fac.routeColor || 0xfef08a });
                for (let p = 0; p < 4; p++) {
                    const sp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), pMat);
                    transferGroup.add(sp);
                    transferPulses.push(sp);
                }
                sakhalin2Group.add(transferGroup);

                const initT = fac.initialT || 0;
                let nextIdx = stops.findIndex(s => s.t > initT);
                if (nextIdx < 0) nextIdx = 0;

                movingShips.push({
                    facility: fac,
                    group,
                    curve: shipCurve,
                    routeLine,
                    routeMat,
                    stops,
                    nextStopIndex: nextIdx,
                    transferGroup,
                    transferLine,
                    transferPulses,
                    t: initT,
                    speed: fac.shipSpeed || 0.015,
                    speedFactor: 1.0,
                    state: 'cruising',
                    dockTimer: 0,
                    progress: 0,
                    statusText: `В рейсе • ${fac.cruiseKnots || 14} узл.`,
                    phaseLabel: 'Рейс'
                });
            }
        }
    });
}

function createDomMarkers() {
    const layer = document.getElementById('markers-layer');
    layer.innerHTML = '';
    cityDomList = [];
    natureDomList = [];
    gridDomList = [];
    markerDomMap.clear();

    CITIES_DATA.forEach(city => {
        let [wx, wz] = lonLatToXZ(city.geoLonLat[0], city.geoLonLat[1]);
        const wy = city.isIsland ? 1.35 : Math.max(0.4, getSakhalinElevation(wx, wz)) + 0.5;

        const el = document.createElement('div');
        el.className = 'city-label-3d';
        el.style.display = 'none';
        const dotClass = city.isIsland ? 'city-dot island-dot' : 'city-dot';
        el.innerHTML = `<span class="${dotClass}"></span><span>${city.name}</span>`;
        layer.appendChild(el);

        cityDomList.push({
            el,
            worldPos: new THREE.Vector3(wx, wy, wz),
            lastX: -9999,
            lastY: -9999,
            visible: false
        });
    });

    const tbCard = document.getElementById('three-brothers-card');
    const tbClose = document.getElementById('btn-close-three-brothers');
    if (tbClose && tbCard) {
        tbClose.addEventListener('click', () => tbCard.classList.remove('open'));
    }

    NATURE_LANDMARKS_DATA.forEach(nl => {
        let [wx, wz] = lonLatToXZ(nl.geoLonLat[0], nl.geoLonLat[1]);
        if (nl.id === 'three-brothers') { wx -= 2.35; wz += 0.15; }
        const baseH = nl.id === 'three-brothers' ? 0.0 : Math.max(0.05, getSakhalinElevation(wx, wz));
        const wy = baseH + (nl.yOffset || 1.2);

        const el = document.createElement('div');
        el.className = 'nature-label-3d' + (nl.id === 'three-brothers' ? ' clickable-landmark' : '');
        el.style.display = 'none';
        el.innerHTML = `<span class="nature-icon">${nl.icon}</span><span>${nl.name}</span>`;
        el.addEventListener('click', e => {
            e.stopPropagation();
            if (nl.id === 'three-brothers' && tbCard) {
                tbCard.classList.add('open');
            } else {
                flyToNatureLandmark(nl.id);
            }
        });
        layer.appendChild(el);

        natureDomList.push({
            el,
            worldPos: new THREE.Vector3(wx, wy, wz),
            lastX: -9999,
            lastY: -9999,
            visible: false
        });
    });

    const gridMarkers = [
        { text: '54°N', lon: 145.4, lat: 54.0 },
        { text: '52°N', lon: 145.4, lat: 52.0 },
        { text: '50°N', lon: 145.4, lat: 50.0 },
        { text: '48°N', lon: 145.4, lat: 48.0 },
        { text: '46°N', lon: 145.4, lat: 46.0 },
        { text: '141°E', lon: 141.0, lat: 45.3 },
        { text: '143°E', lon: 143.0, lat: 45.3 },
        { text: '145°E', lon: 145.0, lat: 45.3 }
    ];
    gridMarkers.forEach(gm => {
        const [gx, gz] = lonLatToXZ(gm.lon, gm.lat);
        const el = document.createElement('div');
        el.className = 'grid-label-3d';
        el.textContent = gm.text;
        el.style.display = 'none';
        layer.appendChild(el);
        gridDomList.push({
            el,
            worldPos: new THREE.Vector3(gx, 0.25, gz),
            lastX: -9999,
            lastY: -9999,
            visible: false
        });
    });

    FACILITIES_DATA.forEach(fac => {
        const el = document.createElement('div');
        el.className = 'marker-3d';
        el.dataset.id = fac.id;
        el.style.display = 'none';
        el.innerHTML = `
            <div class="marker-badge">
                <span class="marker-icon" style="background-color: ${fac.markerColor}; color: ${fac.markerColor};">
                    <span class="w-2 h-2 rounded-full bg-white"></span>
                </span>
                <span class="marker-text text-[11px] font-bold text-white tracking-tight">${fac.code}</span>
            </div>
        `;
        el.addEventListener('click', e => {
            e.stopPropagation();
            selectFacility(fac.id, true);
        });
        layer.appendChild(el);
        markerDomMap.set(fac.id, { el, lastX: -9999, lastY: -9999, visible: false });
    });
}

