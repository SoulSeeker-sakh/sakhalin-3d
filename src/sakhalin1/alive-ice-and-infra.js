'use strict';

// =========================================================================
// 14B. ШАНТАРЫ ЗИМОЙ + СПЛОШНОЙ ПРИПАЙ И ЛЕДОКОЛ ПРОВОДКИ В ДЕ-КАСТРИ (v23)
// =========================================================================
const shantarWinter = {
    entries: [],
    lastMix: -1
};

const _shantarSnowCol = new THREE.Color(0xe6f1fa);
const _shantarTmpCol = new THREE.Color();

// Автоматический поиск всех 3D-мешей Шантарских островов для сезонной покраски в снег
function initShantarWinterSupport() {
    shantarWinter.entries = [];
    shantarWinter.lastMix = -1;
    const [shX, shZ] = lonLatToXZ(137.65, 54.92);
    const bbox = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    const skipGroups = new Set([
        farEastAlive.group,
        s1BackdropGroup,
        s1NeighborsGroup,
        s1NauticalGridGroup,
        s1CityLightsGroup,
        s1NightHalosGroup,
        s1NeighborLightsGroup
    ]);

    function scanRoot(root) {
        if (!root) return;
        root.updateMatrixWorld(true);
        root.traverse(obj => {
            if (!obj || !obj.isMesh || !obj.geometry || !obj.material) return;
            if (obj === s1MainlandMesh || obj === s1TaigaMesh || obj === s1SeaIceMesh) return;
            if (typeof sakhalinMesh !== 'undefined' && obj === sakhalinMesh) return;
            if (typeof waterMesh !== 'undefined' && obj === waterMesh) return;

            // Проверяем, не находится ли меш внутри пропускаемой служебной группы
            let p = obj.parent;
            while (p) {
                if (skipGroups.has(p)) return;
                if (typeof worldClouds !== 'undefined' && p === worldClouds.group) return;
                p = p.parent;
            }

            bbox.setFromObject(obj);
            if (bbox.isEmpty()) return;
            bbox.getCenter(center);
            bbox.getSize(size);

            // Шантарские острова лежат в радиусе 26 ед. от (137.65°E, 54.92°N) и имеют компактный размер
            const dist = Math.hypot(center.x - shX, center.z - shZ);
            if (dist < 26 && size.x < 34 && size.z < 34 && size.y < 14) {
                const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
                if (!mat) return;
                const entry = {
                    mesh: obj,
                    mat: mat,
                    origColor: mat.color ? mat.color.clone() : null,
                    origMap: mat.map || null,
                    origVertColors: null
                };
                const colAttr = obj.geometry.attributes && obj.geometry.attributes.color;
                if (colAttr && colAttr.array) {
                    entry.origVertColors = new Float32Array(colAttr.array);
                }
                shantarWinter.entries.push(entry);
            }
        });
    }

    scanRoot(sakhalin1Group);
    if (shantarWinter.entries.length === 0) {
        scanRoot(scene);
    }
    updateShantarWinterColor(true);
}

function updateShantarWinterColor(force) {
    const rawMix = (typeof winterMix !== 'undefined') ? winterMix : (isWinterMode ? 1.0 : 0.0);
    const wMix = Math.round(rawMix * 25) / 25;
    if (!force && shantarWinter.lastMix === wMix) return;
    shantarWinter.lastMix = wMix;

    for (let i = 0; i < shantarWinter.entries.length; i++) {
        const e = shantarWinter.entries[i];
        if (e.origVertColors && e.mesh.geometry && e.mesh.geometry.attributes.color) {
            const attr = e.mesh.geometry.attributes.color;
            const arr = attr.array;
            const orig = e.origVertColors;
            for (let k = 0; k < arr.length; k += 3) {
                arr[k]     = orig[k]     + (0.90 - orig[k])     * wMix;
                arr[k + 1] = orig[k + 1] + (0.94 - orig[k + 1]) * wMix;
                arr[k + 2] = orig[k + 2] + (0.98 - orig[k + 2]) * wMix;
            }
            attr.needsUpdate = true;
        } else if (e.mat && e.origColor) {
            if (e.origMap) {
                const wantMap = wMix > 0.5 ? null : e.origMap;
                if (e.mat.map !== wantMap) {
                    e.mat.map = wantMap;
                    e.mat.needsUpdate = true;
                }
            }
            _shantarTmpCol.copy(e.origColor).lerp(_shantarSnowCol, wMix);
            e.mat.color.copy(_shantarTmpCol);
        }
    }
}

// Система сплошного зимнего припая и ледокола проводки в Татарском проливе (Де-Кастри)
const tatarIce = {
    built: false,
    fastIceMesh: null,
    fastIceMat: null,
    plates: [],
    boundsXZ: null,
    fastIceMix: 0,
    escortMix: 0,
    icebreakerGroup: null,
    spotlightMat: null,
    beaconMat: null,
    shards: [],
    escortLabelEl: null,
    escortLabelVisible: false,
    escortLastX: -9999,
    escortLastY: -9999,
    // Отслеживание Танкера S1
    tankerObj: null,
    tankerScanMap: new WeakMap(),
    tankerPrevX: 0,
    tankerPrevZ: 0,
    tankerHasPos: false,
    fwdX: 0,
    fwdZ: 1,
    ibX: 0,
    ibZ: 0,
    ibYaw: 0,
    ibInitialized: false
};

const _tatarDummy = new THREE.Object3D();
const _tatarProj = new THREE.Vector3();

// Построение детализированного 3D-ледокола проводки в одном стиле с Танкером S1 (v24)
function createEscortIcebreakerModel() {
    const grp = new THREE.Group();
    grp.visible = false;

    const hullRedMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.42, metalness: 0.18 });
    const beltDarkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.52, metalness: 0.25 });
    const deckGrayMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72 });
    const cabinWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42, metalness: 0.06 });
    const accentOrangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.46, metalness: 0.12 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0b1628, roughness: 0.18, metalness: 0.65 });
    const glowYellowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 1. Обтекаемый ледокольный корпус (ExtrudeGeometry — плавный широкий нос без торчащего клюва)
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, 1.52); // Округлённый усиленный форштевень (+Z)
    hullShape.bezierCurveTo(0.46, 1.24, 0.56, 0.62, 0.55, 0.05);
    hullShape.lineTo(0.52, -1.16);
    hullShape.quadraticCurveTo(0.42, -1.32, 0, -1.32);
    hullShape.quadraticCurveTo(-0.42, -1.32, -0.52, -1.16);
    hullShape.lineTo(-0.55, 0.05);
    hullShape.bezierCurveTo(-0.56, 0.62, -0.46, 1.24, 0, 1.52);

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
        depth: 0.34,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 2
    });
    hullGeo.rotateX(Math.PI / 2);
    const hullMesh = new THREE.Mesh(hullGeo, hullRedMat);
    hullMesh.position.y = 0.38;
    grp.add(hullMesh);

    // Усиленный тёмный ледовый пояс вдоль ватерлинии
    const beltGeo = new THREE.ExtrudeGeometry(hullShape, {
        depth: 0.12,
        bevelEnabled: false
    });
    beltGeo.rotateX(Math.PI / 2);
    const beltMesh = new THREE.Mesh(beltGeo, beltDarkMat);
    beltMesh.scale.set(1.03, 1.0, 1.015);
    beltMesh.position.y = 0.14;
    grp.add(beltMesh);

    // Носовой фальшборт и бак (слегка приподнятая передняя палуба)
    const foreDeck = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.09, 0.85), deckGrayMat);
    foreDeck.position.set(0, 0.42, 0.62);
    grp.add(foreDeck);

    // 2. Многоярусная белая надстройка с выносными крыльями ходового мостика
    const tier1 = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.28, 1.22), cabinWhiteMat);
    tier1.position.set(0, 0.56, 0.02);
    grp.add(tier1);

    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.86), cabinWhiteMat);
    tier2.position.set(0, 0.80, 0.10);
    grp.add(tier2);

    // Выступающие в стороны крылья капитанского мостика (фирменный силуэт ледокола!)
    const bridgeWings = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.15, 0.34), cabinWhiteMat);
    bridgeWings.position.set(0, 0.96, 0.34);
    grp.add(bridgeWings);

    // Панорамное тёмное остекление рубки и тёплые иллюминаторы
    const bridgeGlass = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.075, 0.26), glassMat);
    bridgeGlass.position.set(0, 0.97, 0.41);
    grp.add(bridgeGlass);

    const cabinGlow = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.055, 0.96), glowYellowMat);
    cabinGlow.position.set(0, 0.60, 0.02);
    grp.add(cabinGlow);

    // 3. Две парные дымовые трубы (оранжевый корпус + чёрный оголовок)
    [-0.19, 0.19].forEach(fx => {
        const fn = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 0.42, 10), accentOrangeMat);
        fn.position.set(fx, 1.06, -0.32);
        fn.rotation.x = -0.14;
        grp.add(fn);

        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.09, 10), beltDarkMat);
        top.position.set(fx, 1.28, -0.35);
        top.rotation.x = -0.14;
        grp.add(top);
    });

    // 4. Решётчатая фок-мачта с радаром и ходовым огнём
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.62, 8), cabinWhiteMat);
    mast.position.set(0, 1.32, 0.26);
    grp.add(mast);

    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.05), cabinWhiteMat);
    radarBar.position.set(0, 1.54, 0.26);
    grp.add(radarBar);

    tatarIce.beaconMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.95 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), tatarIce.beaconMat);
    beacon.position.set(0, 1.65, 0.26);
    grp.add(beacon);

    // 5. Кормовая вертолётная площадка с окантовкой и буквой «H» + палубный кран
    const heliBase = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.06, 16), deckGrayMat);
    heliBase.position.set(0, 0.43, -0.88);
    grp.add(heliBase);

    const heliRing = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.30, 18),
        new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    heliRing.rotation.x = -Math.PI / 2;
    heliRing.position.set(0, 0.468, -0.88);
    grp.add(heliRing);

    const hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.22), hMat);
    hL.position.set(-0.08, 0.47, -0.88);
    grp.add(hL);
    const hR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 0.22), hMat);
    hR.position.set(0.08, 0.47, -0.88);
    grp.add(hR);
    const hMid = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.01, 0.04), hMat);
    hMid.position.set(0, 0.47, -0.88);
    grp.add(hMid);

    // Мини-кран у надстройки
    const craneArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.45), accentOrangeMat);
    craneArm.position.set(0.32, 0.68, -0.52);
    craneArm.rotation.x = 0.42;
    grp.add(craneArm);

    // 6. Мощный носовой ледовый прожектор (мягкий объёмный луч вперёд на припай)
    const spotGeo = new THREE.ConeGeometry(1.42, 6.2, 16, 1, true);
    spotGeo.translate(0, -3.1, 0);
    spotGeo.rotateX(-Math.PI / 2 + 0.14);
    tatarIce.spotlightMat = new THREE.MeshBasicMaterial({
        color: 0xfff5cc,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const spotlight = new THREE.Mesh(spotGeo, tatarIce.spotlightMat);
    spotlight.position.set(0, 0.96, 0.56);
    grp.add(spotlight);

    // 7. Осколки ломаемого льда у носа ледокола
    const shardGeo = new THREE.DodecahedronGeometry(0.22, 0);
    const shardMat = new THREE.MeshStandardMaterial({ color: 0xe6f4ff, roughness: 0.35, flatShading: true });
    tatarIce.shards = [];
    for (let i = 0; i < 12; i++) {
        const sm = new THREE.Mesh(shardGeo, shardMat);
        sm.visible = false;
        grp.add(sm);
        tatarIce.shards.push({
            mesh: sm,
            side: i % 2 === 0 ? 1 : -1,
            phase: i / 12
        });
    }

    return grp;
}

function buildTatarStraitIceAndEscort() {
    if (tatarIce.built || !farEastAlive.group) return;
    tatarIce.built = true;

    // 1. Строим плотную мозаику сплошного припая в Амурском лимане, Сахалинском заливе
    //    (вокруг Николаевска-на-Амуре и п-ова Шмидта) и северной части Татарского пролива (Де-Кастри, Александровск-Сахалинский — до ~49.85°N)
    const [c1x, c1z] = lonLatToXZ(139.40, 54.95);
    const [c2x, c2z] = lonLatToXZ(142.45, 49.85);
    const minX = Math.min(c1x, c2x);
    const maxX = Math.max(c1x, c2x);
    const minZ = Math.min(c1z, c2z);
    const maxZ = Math.max(c1z, c2z);
    tatarIce.boundsXZ = { minX, maxX, minZ, maxZ };
    tatarIce.dekastriPolynyaXZ = lonLatToXZ(141.22, 51.42);

    let seed = 93187;
    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    const hexR = 1.65;
    const stepX = hexR * 1.72;
    const stepZ = hexR * 1.48;
    tatarIce.plates = [];

    let row = 0;
    for (let z = minZ; z <= maxZ; z += stepZ) {
        row++;
        const rowShift = (row % 2 === 0) ? stepX * 0.5 : 0;
        const southT = (z - minZ) / Math.max(1, maxZ - minZ); // 0 = север Сахалинского залива (54.95°N), 1 = южная кромка (~49.85°N)

        for (let x = minX + rowShift; x <= maxX; x += stepX) {
            const jx = x + (rnd() - 0.5) * 0.28;
            const jz = z + (rnd() - 0.5) * 0.28;

            // Держим припай строго на воде (без наползания на берег)
            if (getAnyLandElevation(jx, jz) > 0.10) continue;

            // Рваная естественная кромка на северном и западном выходе из Сахалинского залива (никаких ровных обрезов!)
            const eastT = (jx - minX) / Math.max(1, maxX - minX);
            const northWave = Math.sin(jx * 0.19) * 0.06 + (rnd() - 0.5) * 0.09;
            if (southT + northWave < 0.05) continue;
            // На западном краю Сахалинского залива (севернее Николаевска) припай мягко расходится
            const westFeather = Math.sin(jz * 0.21) * 0.08 + (rnd() - 0.5) * 0.12;
            if (southT < 0.36 && eastT + westFeather < 0.16) continue;

            // Ветровая асимметрия на юге пролива: у западного берега (материк) СЗ-ветры раньше отжимают кромку,
            // а у восточного (Сахалин, Александровск) припай заходит чуть дальше на юг
            const windSlope = (1.0 - eastT) * 0.14;
            const jaggedWave = Math.sin(jx * 0.24) * 0.08 + (rnd() - 0.5) * 0.12;
            if (southT + windSlope + jaggedWave > 0.95) continue;

            let edgeFactor = 1.0;
            if (southT + windSlope > 0.78) {
                edgeFactor = Math.max(0.58, 1.0 - (southT + windSlope - 0.78) * 1.55);
            } else if (southT < 0.16) {
                edgeFactor = Math.max(0.58, 0.58 + (southT / 0.16) * 0.42);
            } else if (southT < 0.38 && eastT < 0.26) {
                edgeFactor = Math.max(0.56, 0.56 + ((eastT - 0.08) / 0.18) * 0.44);
            }
            tatarIce.plates.push({
                x: jx,
                z: jz,
                baseScale: hexR * (1.13 + rnd() * 0.12) * edgeFactor,
                rotY: (Math.floor(rnd() * 6) * Math.PI / 3) + (rnd() - 0.5) * 0.14,
                openAmount: 0,
                pushX: 0,
                pushZ: 0,
                tiltX: 0,
                tiltZ: 0,
                phase: rnd() * Math.PI * 2
            });
        }
    }

    const plateGeo = new THREE.CylinderGeometry(0.96, 1.02, 0.16, 6);
    tatarIce.fastIceMat = new THREE.MeshStandardMaterial({
        color: 0xdeeffb,
        emissive: 0x152c44,
        emissiveIntensity: 0.18,
        roughness: 0.44,
        metalness: 0.05,
        flatShading: true,
        transparent: true,
        opacity: 0.0,
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -2
    });

    tatarIce.fastIceMesh = new THREE.InstancedMesh(plateGeo, tatarIce.fastIceMat, Math.max(1, tatarIce.plates.length));
    tatarIce.fastIceMesh.count = tatarIce.plates.length;
    tatarIce.fastIceMesh.visible = false;
    tatarIce.fastIceMesh.receiveShadow = true;
    farEastAlive.group.add(tatarIce.fastIceMesh);

    // 2. Создаём 3D-ледокол проводки и его метку (виден в режиме Зима + Ночь)
    tatarIce.icebreakerGroup = createEscortIcebreakerModel();
    farEastAlive.group.add(tatarIce.icebreakerGroup);

    const layer = document.getElementById('markers-layer');
    if (layer) {
        const el = document.createElement('div');
        el.className = 'fe-landmark-label-3d';
        el.style.borderColor = 'rgba(56, 189, 248, 0.68)';
        el.style.color = '#e0f2fe';
        el.textContent = 'Ледокол проводки';
        el.style.display = 'none';
        layer.appendChild(el);
        tatarIce.escortLabelEl = el;
    }
}

// Автоматический поиск движущегося Танкера S1 в группе sakhalin1Group
function detectS1TankerObject() {
    if (tatarIce.tankerObj) return tatarIce.tankerObj;

    // 1. Прямая привязка к модели «Танкер S1» из s1MovingShips (100% точность)
    if (typeof s1MovingShips !== 'undefined' && s1MovingShips.length > 0) {
        const entry = s1MovingShips.find(s => s && s.facility && s.facility.id === 's1-tanker-dekastri') || s1MovingShips[0];
        if (entry && entry.group) {
            tatarIce.tankerObj = entry.group;
            return entry.group;
        }
    }

    // 2. Проверяем уже найденные суда из модуля кильватера v19
    if (typeof goldMaster !== 'undefined' && goldMaster.shipTrackers) {
        for (let i = 0; i < goldMaster.shipTrackers.length; i++) {
            const sh = goldMaster.shipTrackers[i].ship;
            if (sh && sh.parent === sakhalin1Group && sh !== farEastAlive.ferryGroup && sh !== tatarIce.icebreakerGroup) {
                tatarIce.tankerObj = sh;
                return sh;
            }
        }
    }

    // Прямое отслеживание смещения групп на воде внутри sakhalin1Group
    if (!sakhalin1Group) return null;
    for (let i = 0; i < sakhalin1Group.children.length; i++) {
        const ch = sakhalin1Group.children[i];
        if (!ch || !ch.isGroup || !ch.visible) continue;
        if (
            ch === farEastAlive.group ||
            ch === farEastAlive.ferryGroup ||
            ch === s1BackdropGroup ||
            ch === s1NeighborsGroup ||
            ch === s1NauticalGridGroup ||
            ch === s1CityLightsGroup ||
            ch === s1NightHalosGroup ||
            ch === s1NeighborLightsGroup
        ) continue;
        if (ch.position.y < -0.5 || ch.position.y > 3.0) continue;

        const rec = tatarIce.tankerScanMap.get(ch);
        if (!rec) {
            tatarIce.tankerScanMap.set(ch, { x: ch.position.x, z: ch.position.z });
        } else {
            const moved = Math.hypot(ch.position.x - rec.x, ch.position.z - rec.z);
            rec.x = ch.position.x;
            rec.z = ch.position.z;
            if (moved > 0.008 && moved < 25 && getAnyLandElevation(ch.position.x, ch.position.z) < 0.15) {
                tatarIce.tankerObj = ch;
                return ch;
            }
        }
    }
    return null;
}

function updateTatarStraitIceAndEscort(dt, elapsed, isS1Visible, s1Alpha) {
    if (!tatarIce.built) return;

    // Припай в Амурском лимане, Сахалинском заливе и северном Татарском проливе стоит всю зиму (и днём, и ночью!)
    const targetMix = isWinterMode ? 1.0 : 0.0;
    tatarIce.fastIceMix += (targetMix - tatarIce.fastIceMix) * Math.min(1, dt * 1.65);
    if (Math.abs(targetMix - tatarIce.fastIceMix) < 0.003) tatarIce.fastIceMix = targetMix;

    tatarIce.escortMix += (targetMix - tatarIce.escortMix) * Math.min(1, dt * 2.1);
    if (Math.abs(targetMix - tatarIce.escortMix) < 0.003) tatarIce.escortMix = targetMix;

    // 1. Обновляем трекинг Танкера S1 (нужен и днём для раздвигания льдин, и ночью для ледокола!)
    const tanker = isS1Visible ? detectS1TankerObject() : tatarIce.tankerObj;
    if (tanker && isS1Visible) {
        const tx = tanker.position.x;
        const tz = tanker.position.z;
        if (tatarIce.tankerHasPos) {
            const dx = tx - tatarIce.tankerPrevX;
            const dz = tz - tatarIce.tankerPrevZ;
            const step = Math.hypot(dx, dz);
            if (step > 0.0015 && step < 18) {
                const nx = dx / step;
                const nz = dz / step;
                const turnRate = Math.min(1, dt * 4.2);
                tatarIce.fwdX += (nx - tatarIce.fwdX) * turnRate;
                tatarIce.fwdZ += (nz - tatarIce.fwdZ) * turnRate;
                const fLen = Math.hypot(tatarIce.fwdX, tatarIce.fwdZ) || 1;
                tatarIce.fwdX /= fLen;
                tatarIce.fwdZ /= fLen;
            }
        } else {
            tatarIce.tankerHasPos = true;
        }
        tatarIce.tankerPrevX = tx;
        tatarIce.tankerPrevZ = tz;
    }

    // 2. Обновляем 3D-ледокол проводки впереди Танкера S1 (Зима + Ночь)
    const tankerEntry = (typeof s1MovingShips !== 'undefined' && s1MovingShips.length > 0)
        ? (s1MovingShips.find(s => s && s.facility && s.facility.id === 's1-tanker-dekastri') || s1MovingShips[0])
        : null;
    const isTankerDocked = Boolean(tankerEntry && tankerEntry.state === 'docked');

    const showEscort = isS1Visible && activeProject === 'sakhalin1' && Boolean(tanker) && tatarIce.escortMix > 0.02;
    if (tatarIce.icebreakerGroup) {
        tatarIce.icebreakerGroup.visible = showEscort;
        if (showEscort) {
            const tx = tanker.position.x;
            const tz = tanker.position.z;

            let targetX;
            let targetZ;
            let wantYaw;
            if (isTankerDocked) {
                // Пока танкер грузится в полынье у ВПУ Де-Кастри, ледокол ждёт строго на линии маршрута чуть впереди по курсу
                if (tankerEntry && tankerEntry.curve) {
                    const waitT = Math.min(0.99, tankerEntry.t + 0.048);
                    const waitPt = tankerEntry.curve.getPointAt(waitT);
                    const waitTan = tankerEntry.curve.getTangentAt(waitT);
                    targetX = waitPt.x;
                    targetZ = waitPt.z;
                    wantYaw = Math.atan2(waitTan.x, waitTan.z);
                } else {
                    targetX = tx + 2.85;
                    targetZ = tz + 2.65;
                    wantYaw = Math.atan2(0.35, 0.94);
                }
            } else if (tankerEntry && tankerEntry.curve) {
                // Идём строго по самой кривой маршрута Танкера S1 чуть впереди него — ледокол никогда не съезжает с линии!
                const leadT = Math.min(0.995, tankerEntry.t + 0.048);
                const leadPt = tankerEntry.curve.getPointAt(leadT);
                const leadTan = tankerEntry.curve.getTangentAt(leadT);
                targetX = leadPt.x;
                targetZ = leadPt.z;
                wantYaw = Math.atan2(leadTan.x, leadTan.z);
            } else {
                // Фоллбэк, если кривая недоступна
                let lead = 4.8;
                targetX = tx + tatarIce.fwdX * lead;
                targetZ = tz + tatarIce.fwdZ * lead;
                while (lead > 1.8 && getAnyLandElevation(targetX, targetZ) > -0.35) {
                    lead -= 0.50;
                    targetX = tx + tatarIce.fwdX * lead;
                    targetZ = tz + tatarIce.fwdZ * lead;
                }
                wantYaw = Math.atan2(tatarIce.fwdX, tatarIce.fwdZ);
            }
            // Страховочный сдвиг в открытый пролив (+X), если точка всё ещё близка к мелководью/суше
            let guard = 0;
            while (getAnyLandElevation(targetX, targetZ) > -0.35 && guard < 12) {
                targetX += 0.85;
                guard++;
            }

            if (!tatarIce.ibInitialized || Math.hypot(targetX - tatarIce.ibX, targetZ - tatarIce.ibZ) > 10.0) {
                tatarIce.ibX = targetX;
                tatarIce.ibZ = targetZ;
                tatarIce.ibYaw = wantYaw;
                tatarIce.ibInitialized = true;
            } else {
                const follow = Math.min(1, dt * 4.5);
                tatarIce.ibX += (targetX - tatarIce.ibX) * follow;
                tatarIce.ibZ += (targetZ - tatarIce.ibZ) * follow;
                let diff = (wantYaw - tatarIce.ibYaw) % (Math.PI * 2);
                if (diff > Math.PI) diff -= Math.PI * 2;
                if (diff < -Math.PI) diff += Math.PI * 2;
                tatarIce.ibYaw += diff * Math.min(1, dt * 4.8);
            }

            const shipFade = (s1MovingShips && s1MovingShips[0] && s1MovingShips[0].fadeAlpha !== undefined)
                ? s1MovingShips[0].fadeAlpha
                : 1.0;
            const es = tatarIce.escortMix * tatarIce.escortMix * (3 - 2 * tatarIce.escortMix) * shipFade;
            const shipScale = Math.max(0.85, Math.min(1.45, tanker.scale ? tanker.scale.x * 1.05 : 1.12)) * es;

            tatarIce.icebreakerGroup.position.set(
                tatarIce.ibX,
                0.06 + Math.sin(elapsed * 3.1) * 0.018,
                tatarIce.ibZ
            );
            tatarIce.icebreakerGroup.rotation.set(
                Math.sin(elapsed * 2.4) * 0.03,
                tatarIce.ibYaw,
                Math.cos(elapsed * 2.8) * 0.025
            );
            tatarIce.icebreakerGroup.scale.setScalar(Math.max(0.01, shipScale));

            if (tatarIce.spotlightMat) {
                tatarIce.spotlightMat.opacity = 0.28 * es * s1Alpha * Math.max(0.04, nightMix);
            }
            if (tatarIce.beaconMat) {
                tatarIce.beaconMat.opacity = (0.55 + Math.sin(elapsed * 6.5) * 0.45) * es * s1Alpha;
            }

            // Разлетающиеся куски ломаемого льда у носа ледокола
            const inIceZone = tatarIce.boundsXZ &&
                tatarIce.ibX >= tatarIce.boundsXZ.minX && tatarIce.ibX <= tatarIce.boundsXZ.maxX &&
                tatarIce.ibZ >= tatarIce.boundsXZ.minZ && tatarIce.ibZ <= tatarIce.boundsXZ.maxZ;

            for (let i = 0; i < tatarIce.shards.length; i++) {
                const sh = tatarIce.shards[i];
                if (!inIceZone || tatarIce.fastIceMix < 0.25) {
                    sh.mesh.visible = false;
                    continue;
                }
                sh.mesh.visible = true;
                const cyc = (elapsed * 1.15 + sh.phase) % 1.0;
                const arch = Math.sin(cyc * Math.PI);
                sh.mesh.position.set(
                    sh.side * (0.48 + cyc * 1.35),
                    0.10 + arch * 0.32,
                    1.42 - cyc * 1.75
                );
                sh.mesh.rotation.set(cyc * 4.2, cyc * 3.1 * sh.side, cyc * 2.5);
                sh.mesh.scale.setScalar(Math.max(0.05, (1.0 - cyc * 0.72) * tatarIce.fastIceMix));
            }
        }
    }

    // 3. Обновляем сплошной припай и проламываемый тёмный канал во льду
    const showFastIce = isS1Visible && tatarIce.fastIceMix > 0.01 && tatarIce.fastIceMesh;
    if (tatarIce.fastIceMesh) {
        tatarIce.fastIceMesh.visible = showFastIce;
        if (showFastIce) {
            const fEase = tatarIce.fastIceMix * tatarIce.fastIceMix * (3.0 - 2.0 * tatarIce.fastIceMix);
            tatarIce.fastIceMat.opacity = Math.min(1.0, 1.0 * fEase * s1Alpha);
            tatarIce.fastIceMat.emissiveIntensity = 0.08 + nightMix * 0.22;

            // Список судов и рабочей полыньи у ВПУ Де-Кастри, поддерживающих открытый тёмный канал
            const breakers = [];
            if (tatarIce.dekastriPolynyaXZ) {
                breakers.push({ x: tatarIce.dekastriPolynyaXZ[0], z: tatarIce.dekastriPolynyaXZ[1], r: 3.95 });
            }
            if (showEscort) {
                breakers.push({ x: tatarIce.ibX, z: tatarIce.ibZ, r: 4.15 });
            }
            if (tanker) {
                breakers.push({ x: tanker.position.x, z: tanker.position.z, r: 3.75 });
            }


            const plates = tatarIce.plates;
            for (let i = 0; i < plates.length; i++) {
                const pl = plates[i];
                let hit = false;
                for (let b = 0; b < breakers.length; b++) {
                    const br = breakers[b];
                    const dx = pl.x - br.x;
                    const dz = pl.z - br.z;
                    const dSq = dx * dx + dz * dz;
                    if (dSq < br.r * br.r) {
                        const dist = Math.sqrt(dSq) || 0.05;
                        const impact = Math.min(1.0, (1.0 - dist / br.r) * 1.75 + 0.38);
                        if (impact > pl.openAmount) pl.openAmount = impact;
                        pl.pushX = (dx / dist) * 1.15;
                        pl.pushZ = (dz / dist) * 1.15;
                        pl.tiltX = (dz / dist) * 0.42;
                        pl.tiltZ = -(dx / dist) * 0.42;
                        hit = true;
                    }
                }

                if (!hit && pl.openAmount > 0) {
                    // Тёмный канал остаётся открытым за ледоколом, пока идёт танкер, затем плавно замерзает
                    pl.openAmount = Math.max(0, pl.openAmount - dt * 0.052);
                }

                const brk = pl.openAmount * pl.openAmount * (3.0 - 2.0 * pl.openAmount);
                const sc = pl.baseScale * fEase * Math.max(0.001, 1.0 - brk * 0.96);

                _tatarDummy.position.set(
                    pl.x + pl.pushX * brk,
                    0.075 - brk * 0.12 + Math.sin(elapsed * 0.9 + pl.phase) * 0.008,
                    pl.z + pl.pushZ * brk
                );
                _tatarDummy.rotation.set(pl.tiltX * brk, pl.rotY + brk * 0.45, pl.tiltZ * brk);
                _tatarDummy.scale.set(sc, Math.max(0.001, fEase * (1.0 - brk * 0.6)), sc);
                _tatarDummy.updateMatrix();
                tatarIce.fastIceMesh.setMatrixAt(i, _tatarDummy.matrix);
            }
            tatarIce.fastIceMesh.instanceMatrix.needsUpdate = true;
        }
    }

    // 4. DOM-метка «Ледокол проводки» (видна только ночью зимой при приближении)
    if (tatarIce.escortLabelEl) {
        const camDist = (camera && controls) ? camera.position.distanceTo(controls.target) : 400;
        const mobileMult = isMobileViewport() ? 1.24 : 1.0;
        const allowLabel = showEscort && tatarIce.escortMix > 0.55 &&
            isFarEastProject() && areLabelsVisible && !isGlobeIntroActive &&
            !(typeof goldMaster !== 'undefined' && goldMaster.cinemaMode) &&
            camDist < 225 * mobileMult;

        if (!allowLabel) {
            if (tatarIce.escortLabelVisible) {
                tatarIce.escortLabelEl.style.display = 'none';
                tatarIce.escortLabelVisible = false;
            }
        } else {
            const w = viewportWidth || window.innerWidth;
            const h = viewportHeight || window.innerHeight;
            _tatarProj.set(tatarIce.ibX, 2.2, tatarIce.ibZ).project(camera);
            if (_tatarProj.z > 1) {
                if (tatarIce.escortLabelVisible) {
                    tatarIce.escortLabelEl.style.display = 'none';
                    tatarIce.escortLabelVisible = false;
                }
            } else {
                const sx = Math.round((_tatarProj.x * 0.5 + 0.5) * w);
                const sy = Math.round((-_tatarProj.y * 0.5 + 0.5) * h);
                if (sx < -80 || sx > w + 80 || sy < -40 || sy > h + 40) {
                    if (tatarIce.escortLabelVisible) {
                        tatarIce.escortLabelEl.style.display = 'none';
                        tatarIce.escortLabelVisible = false;
                    }
                } else {
                    if (!tatarIce.escortLabelVisible) {
                        tatarIce.escortLabelEl.style.display = 'flex';
                        tatarIce.escortLabelVisible = true;
                    }
                    if (sx !== tatarIce.escortLastX || sy !== tatarIce.escortLastY) {
                        tatarIce.escortLabelEl.style.transform = 'translate3d(' + sx + 'px, ' + sy + 'px, 0) translate(-50%, -100%)';
                        tatarIce.escortLastX = sx;
                        tatarIce.escortLastY = sy;
                    }
                }
            }
        }
    }
}

// =========================================================================
// 14C. ДЕТАЛИЗИРОВАННАЯ ИНФРАСТРУКТУРА «САХАЛИН-1» НА ДВ (ZOOM LOD, v25)
// =========================================================================
const s1DetailInfra = {
    built: false,
    group: null,
    flares: [],
    steamPuffs: [],
    beacons: [],
    nightMats: [],
    lodMix: 0
};

function buildSakhalin1DetailedInfra() {
    if (s1DetailInfra.built || !farEastAlive.group) return;
    s1DetailInfra.built = true;

    s1DetailInfra.group = new THREE.Group();
    farEastAlive.group.add(s1DetailInfra.group);

    // Общие материалы промышленных узлов
    const tankWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.42, metalness: 0.18 });
    const tankBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.48, metalness: 0.22 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.45, metalness: 0.55 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.58, metalness: 0.45 });
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.86, flatShading: true });
    const orangeAccentMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.46, metalness: 0.16 });
    const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const yellowBuoyMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.15 });
    const winGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.0 });
    const floodGlowMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.0 });
    s1DetailInfra.nightMats.push(winGlowMat, floodGlowMat);

    function addOilTank(parent, x, z, r, h, accentMat) {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), tankWhiteMat);
        body.position.set(x, h * 0.5, z);
        parent.add(body);

        const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.015, r * 1.015, h * 0.22, 14), accentMat || tankBlueMat);
        band.position.set(x, h * 0.72, z);
        parent.add(band);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.02, h * 0.22, 14), steelMat);
        roof.position.set(x, h + h * 0.11, z);
        parent.add(roof);
    }

    function addFlareStack(parent, x, z, height) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.09, height, 6), darkSteelMat);
        pole.position.set(x, height * 0.5, z);
        parent.add(pole);

        const flameMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, transparent: true, opacity: 0.92 });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.68, 6), flameMat);
        flame.position.set(x, height + 0.30, z);
        parent.add(flame);

        const coreMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 });
        const core = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 6), coreMat);
        core.position.set(x, height + 0.20, z);
        parent.add(core);

        s1DetailInfra.flares.push({ flame, core, baseY: height + 0.30, phase: Math.random() * Math.PI * 2 });
    }

    function addLightMast(parent, x, z, h) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, h, 5), steelMat);
        m.position.set(x, h * 0.5, z);
        parent.add(m);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.12), floodGlowMat);
        lamp.position.set(x, h + 0.04, z);
        parent.add(lamp);
    }

    function addSitePadWithSkirt(parent, w, d, cx = 0, cz = 0) {
        const pad = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), concreteMat);
        pad.position.set(cx, 0.07, cz);
        parent.add(pad);
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 1.45, d - 0.08), darkSteelMat);
        skirt.position.set(cx, -0.72, cz);
        parent.add(skirt);
    }

    // -----------------------------------------------------------------
    // 1. ДЕ-КАСТРИ (Нефтеотгрузочный терминал: резервуарный парк, факел, насосная — на реальной высоте площадки!)
    // -----------------------------------------------------------------
    {
        const [dx, dz] = lonLatToXZ(140.76, 51.48);
        const dkX = dx - 1.45;
        const dkZ = dz - 0.55;
        const dy = getAnySiteMaxElevation(dkX, dkZ, 2.35) + 0.14;
        const dk = new THREE.Group();
        dk.position.set(dkX, dy, dkZ);
        s1DetailInfra.group.add(dk);
        if (typeof s1ProjectExtraObjects !== 'undefined') s1ProjectExtraObjects.push({ mesh: dk, projects: ['sakhalin1'] });

        // Бетонное обвалование резервуарного парка с глубоким цоколем на склоне
        addSitePadWithSkirt(dk, 3.4, 2.8, -0.5, 0);

        // 4 крупных нефтяных резервуара (по 100 тыс. м3)
        addOilTank(dk, -1.25, -0.68, 0.54, 0.68, tankBlueMat);
        addOilTank(dk,  0.15, -0.68, 0.54, 0.68, tankBlueMat);
        addOilTank(dk, -1.25,  0.68, 0.54, 0.68, orangeAccentMat);
        addOilTank(dk,  0.15,  0.68, 0.54, 0.68, orangeAccentMat);

        // Насосная станция и факел дожига
        const pumpHall = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.48, 0.72), darkSteelMat);
        pumpHall.position.set(1.35, 0.26, -0.35);
        dk.add(pumpHall);
        const pumpWin = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.48), winGlowMat);
        pumpWin.position.set(1.35, 0.34, -0.35);
        dk.add(pumpWin);

        addFlareStack(dk, -1.95, -1.25, 2.15);
        addLightMast(dk, 1.85, 0.85, 1.35);

        // Сигнальный маячок у выносной башни ВПУ в чистой воде бухты Чихачёва (синхронно с buildDeKastriSpmTower3D)
        const [bx, bz] = lonLatToXZ(141.08, 51.44);
        const spmBeaconMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 });
        const spmBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), spmBeaconMat);
        spmBeacon.position.set(bx - 0.12, 1.86, bz);
        s1DetailInfra.beacons.push({ mat: spmBeaconMat, phase: 0.4 });
        s1DetailInfra.group.add(spmBeacon);
        if (typeof s1ProjectExtraObjects !== 'undefined') s1ProjectExtraObjects.push({ mesh: spmBeacon, projects: ['sakhalin1'] });
    }

    // -----------------------------------------------------------------
    // 2. КОМСОМОЛЬСК (Компрессорная станция и ГРС: цех, сепараторы, АВО газа)
    // -----------------------------------------------------------------
    {
        const [kx, kz] = lonLatToXZ(137.04, 50.54);
        const kmsX = kx + 1.65;
        const kmsZ = kz + 0.55;
        const ky = getAnySiteMaxElevation(kmsX, kmsZ, 1.95) + 0.08;
        const kms = new THREE.Group();
        kms.position.set(kmsX, ky, kmsZ);
        s1DetailInfra.group.add(kms);
        if (typeof s1ProjectExtraObjects !== 'undefined') s1ProjectExtraObjects.push({ mesh: kms, projects: ['shv'] });

        addSitePadWithSkirt(kms, 2.8, 2.2, 0, 0);

        // Компрессорный цех с двойными выхлопными шахтами
        const hall = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.56, 0.86), tankWhiteMat);
        hall.position.set(-0.45, 0.34, -0.35);
        kms.add(hall);
        const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.10, 0.92), tankBlueMat);
        hallRoof.position.set(-0.45, 0.65, -0.35);
        kms.add(hallRoof);
        const hallWin = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.12, 0.55), winGlowMat);
        hallWin.position.set(-0.45, 0.42, -0.35);
        kms.add(hallWin);

        // 3 вертикальных газовых сепаратора (высокие цилиндры)
        for (let s = 0; s < 3; s++) {
            const sep = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.05, 10), steelMat);
            sep.position.set(0.65 + s * 0.34 - 0.15, 0.62, -0.45);
            kms.add(sep);
        }

        // Аппараты воздушного охлаждения газа (АВО)
        const cooler = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.34, 0.58), darkSteelMat);
        cooler.position.set(0.15, 0.29, 0.55);
        kms.add(cooler);
        for (let f = -1; f <= 1; f++) {
            const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 8), steelMat);
            fan.position.set(0.15 + f * 0.46, 0.48, 0.55);
            kms.add(fan);
        }

        addLightMast(kms, -1.25, 0.95, 1.25);
    }

    // -----------------------------------------------------------------
    // 3. ХАБАРОВСК (Газораспределительный узел + газгольдеры + электроподстанция)
    // -----------------------------------------------------------------
    {
        const [hx, hz] = lonLatToXZ(135.12, 48.46);
        const khbX = hx + 1.85;
        const khbZ = hz + 0.45;
        const hy = getAnySiteMaxElevation(khbX, khbZ, 2.05) + 0.08;
        const khb = new THREE.Group();
        khb.position.set(khbX, hy, khbZ);
        s1DetailInfra.group.add(khb);
        if (typeof s1ProjectExtraObjects !== 'undefined') s1ProjectExtraObjects.push({ mesh: khb, projects: ['shv'] });

        addSitePadWithSkirt(khb, 3.2, 2.4, 0, 0);

        // 2 сферических газгольдера (узнаваемый символ газового хаба)
        [-0.78, 0.18].forEach(gx => {
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), tankWhiteMat);
            sphere.position.set(gx, 0.66, -0.42);
            khb.add(sphere);
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.32, 6), darkSteelMat);
            leg.position.set(gx, 0.22, -0.42);
            khb.add(leg);
        });

        // Электроподстанция (трансформаторы и порталы ЛЭП — энергетика)
        for (let t = 0; t < 2; t++) {
            const tr = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.36), darkSteelMat);
            tr.position.set(0.98, 0.32, -0.48 + t * 0.65);
            khb.add(tr);
        }
        const portalGeo = new THREE.BoxGeometry(0.08, 1.15, 0.08);
        [-0.55, 0.35].forEach(pz => {
            const p = new THREE.Mesh(portalGeo, steelMat);
            p.position.set(1.38, 0.66, pz);
            khb.add(p);
        });
        const crossBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.05), steelMat);
        crossBar.position.set(1.38, 1.18, -0.10);
        khb.add(crossBar);

        // Диспетчерский блок
        const disp = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.48, 0.64), tankWhiteMat);
        disp.position.set(-0.35, 0.32, 0.65);
        khb.add(disp);
        const dispWin = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.14, 0.42), winGlowMat);
        dispWin.position.set(-0.35, 0.38, 0.65);
        khb.add(dispWin);

        addLightMast(khb, -1.42, 0.98, 1.35);
    }

    // -----------------------------------------------------------------
    // 4. ВЛАДИВОСТОК (Конечный газовый терминал и ТЭЦ-энергоблок: градирня с паром + 2 трубы — на реальной высоте сопки!)
    // -----------------------------------------------------------------
    {
        const [vx, vz] = lonLatToXZ(131.86, 43.16);
        const vldX = vx - 1.55;
        const vldZ = vz - 1.35;
        const vy = getAnySiteMaxElevation(vldX, vldZ, 2.35) + 0.16;
        const vld = new THREE.Group();
        vld.position.set(vldX, vy, vldZ);
        s1DetailInfra.group.add(vld);
        if (typeof s1ProjectExtraObjects !== 'undefined') s1ProjectExtraObjects.push({ mesh: vld, projects: ['shv'] });

        addSitePadWithSkirt(vld, 3.2, 2.5, 0, 0);

        // Энергоблок / турбинный зал
        const plant = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.62, 0.96), tankWhiteMat);
        plant.position.set(-0.45, 0.38, 0.35);
        vld.add(plant);
        const plantWin = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.14, 0.62), winGlowMat);
        plantWin.position.set(-0.45, 0.46, 0.35);
        vld.add(plantWin);

        // Гиперболоидная градирня
        const ctBot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.56, 0.72, 12), concreteMat);
        ctBot.position.set(0.95, 0.44, -0.32);
        vld.add(ctBot);
        const ctTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.46, 12), tankWhiteMat);
        ctTop.position.set(0.95, 1.02, -0.32);
        vld.add(ctTop);

        // Мягкие клубы пара над градирней
        const puffGeo = new THREE.DodecahedronGeometry(0.28, 0);
        for (let p = 0; p < 5; p++) {
            const pMat = new THREE.MeshBasicMaterial({ color: 0xf1f5f9, transparent: true, opacity: 0.0 });
            const pm = new THREE.Mesh(puffGeo, pMat);
            vld.add(pm);
            s1DetailInfra.steamPuffs.push({
                mesh: pm,
                mat: pMat,
                baseX: 0.95,
                baseY: 1.28,
                baseZ: -0.32,
                phase: p / 5
            });
        }

        // Две высокие красно-белые трубы ТЭЦ
        [-0.85, -0.25].forEach(cx => {
            const ch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.35, 8), tankWhiteMat);
            ch1.position.set(cx, 0.78, -0.68);
            vld.add(ch1);
            const ch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.35, 8), redStripeMat);
            ch2.position.set(cx, 1.56, -0.68);
            vld.add(ch2);
        });

        // 2 резервуара
        addOilTank(vld, 0.95, 0.68, 0.38, 0.52, orangeAccentMat);
        addLightMast(vld, -1.45, -0.95, 1.35);
    }

    // -----------------------------------------------------------------
    // 5. ЧАЙВО (Береговой комплекс подготовки нефти и газа + факел)
    // -----------------------------------------------------------------
    {
        const [cx, cz] = lonLatToXZ(143.12, 52.38);
        const cy = Math.max(0.28, getSakhalinElevation(cx, cz));
        const chv = new THREE.Group();
        chv.position.set(cx - 1.45, cy, cz + 0.85);
        s1DetailInfra.group.add(chv);
        if (typeof s1ProjectExtraObjects !== 'undefined') s1ProjectExtraObjects.push({ mesh: chv, projects: ['sakhalin1'] });

        addOilTank(chv, -0.45, 0.0, 0.36, 0.48, orangeAccentMat);
        addOilTank(chv,  0.35, 0.0, 0.36, 0.48, tankBlueMat);
        addFlareStack(chv, -0.95, -0.65, 1.85);
    }
}

function updateSakhalin1DetailedInfra(dt, elapsed, isS1Visible, s1Alpha) {
    if (!s1DetailInfra.built || !s1DetailInfra.group) return;

    const camDist = (camera && controls) ? camera.position.distanceTo(controls.target) : 400;
    const mobileMult = isMobileViewport() ? 1.24 : 1.0;
    // Инфраструктура плавно «прорастает» и раскрывается при приближении (Zoom LOD)
    const wantVisible = isS1Visible && camDist < 290 * mobileMult;
    const targetLod = wantVisible ? 1.0 : 0.0;
    s1DetailInfra.lodMix += (targetLod - s1DetailInfra.lodMix) * Math.min(1, dt * 4.5);
    if (Math.abs(targetLod - s1DetailInfra.lodMix) < 0.004) s1DetailInfra.lodMix = targetLod;

    const show = s1DetailInfra.lodMix > 0.01 && isS1Visible;
    s1DetailInfra.group.visible = show;
    if (!show) return;

    // Ночная подсветка окон и прожекторов промзон
    for (let i = 0; i < s1DetailInfra.nightMats.length; i++) {
        s1DetailInfra.nightMats[i].opacity = nightMix * 0.90 * s1Alpha * s1DetailInfra.lodMix;
    }

    // Живое пламя на факелах Де-Кастри и Чайво
    for (let i = 0; i < s1DetailInfra.flares.length; i++) {
        const fl = s1DetailInfra.flares[i];
        const flicker = 0.82 + Math.sin(elapsed * 21.0 + fl.phase) * 0.18 + Math.cos(elapsed * 33.0 + fl.phase) * 0.10;
        fl.flame.scale.set(0.95 + Math.sin(elapsed * 14 + fl.phase) * 0.12, flicker, 0.95);
        fl.core.scale.set(1.0, flicker * 0.9, 1.0);
        fl.flame.material.opacity = (0.78 + nightMix * 0.22) * s1Alpha;
    }

    // Пар над градирней во Владивостоке
    for (let i = 0; i < s1DetailInfra.steamPuffs.length; i++) {
        const sp = s1DetailInfra.steamPuffs[i];
        const t = (elapsed * 0.28 + sp.phase) % 1.0;
        sp.mesh.position.set(
            sp.baseX + t * 0.75 + Math.sin(elapsed * 1.6 + i) * 0.10,
            sp.baseY + t * 2.1,
            sp.baseZ - t * 0.35
        );
        sp.mesh.scale.setScalar(0.45 + t * 1.25);
        sp.mat.opacity = Math.sin(t * Math.PI) * (isWinterMode ? 0.56 : 0.38) * s1Alpha * s1DetailInfra.lodMix;
    }

    // Мигающие сигнальные маячки ВПУ
    for (let i = 0; i < s1DetailInfra.beacons.length; i++) {
        const b = s1DetailInfra.beacons[i];
        const blink = Math.sin(elapsed * 4.5 + b.phase) > 0.25 ? 1.0 : 0.18;
        b.mat.opacity = blink * (0.45 + nightMix * 0.55) * s1Alpha;
    }
}

function buildFarEastAlive() {
    if (farEastAlive.built || !sakhalin1Group) return;
    farEastAlive.built = true;

    farEastAlive.group = new THREE.Group();
    sakhalin1Group.add(farEastAlive.group);

    buildFarEastRiversAndLakes();
    buildFarEastBridges();
    buildVostochnyCosmodrome();
    buildVaninoKholmskFerry();
    buildFarEastAirRoutes();
    buildFarEastNatureEffects();
    buildFarEastAliveDomLabels();
    initShantarWinterSupport();
    buildTatarStraitIceAndEscort();
    buildSakhalin1DetailedInfra();
}

function updateFarEastAlive(dt, elapsed) {
    if (!farEastAlive.built) return;

    const s1Alpha = (typeof projectCrossfade !== 'undefined') ? projectCrossfade.s1Alpha : (isFarEastProject() ? 1 : 0);
    const isS1Visible = Boolean(sakhalin1Group && sakhalin1Group.visible && s1Alpha > 0.01);
    updateShantarWinterColor(false);
    updateTatarStraitIceAndEscort(dt, elapsed, isS1Visible, s1Alpha);
    updateSakhalin1DetailedInfra(dt, elapsed, isS1Visible, s1Alpha);

    // 1. Синхронизация цвета рек/озёр (лето -> зимний лёд -> ночь) и подсветки мостов
    if (isS1Visible) {
        const wMix = isWinterMode ? 1.0 : 0.0;
        if (farEastAlive.russkyIslandMat) {
            const dayCol = isWinterMode ? 0xddeaf5 : 0x3c7d52;
            const nightCol = isWinterMode ? 0x3b5369 : 0x1a3b28;
            _feWaterTmpDay.setHex(dayCol);
            _feWaterTmpNight.setHex(nightCol);
            farEastAlive.russkyIslandMat.color.copy(_feWaterTmpDay).lerp(_feWaterTmpNight, nightMix);
        }
        if (farEastAlive.waterMat) {
            const iceDay = new THREE.Color(0xeef6ff);
            const iceNight = new THREE.Color(0xcce2f5);
            _feWaterTmpDay.copy(_feWaterDaySummer).lerp(iceDay, wMix);
            _feWaterTmpNight.copy(_feWaterNightSummer).lerp(iceNight, wMix);
            farEastAlive.waterMat.color.copy(_feWaterTmpDay).lerp(_feWaterTmpNight, nightMix);
            farEastAlive.waterMat.emissive.setHex(isWinterMode ? 0x2f4d6b : 0x051526);
            farEastAlive.waterMat.emissiveIntensity = isWinterMode ? (0.18 + nightMix * 0.28) : (nightMix * 0.08);
            farEastAlive.waterMat.roughness = isWinterMode ? 0.36 : 0.22;
            farEastAlive.waterMat.metalness = isWinterMode ? 0.08 : 0.22;
        }
        if (farEastAlive.shoreRimMat) {
            const shoreDay = isWinterMode ? 0xdceaf5 : 0x3f6b58;
            const shoreNight = isWinterMode ? 0x3b5369 : 0x1a3529;
            _feWaterTmpDay.setHex(shoreDay);
            _feWaterTmpNight.setHex(shoreNight);
            farEastAlive.shoreRimMat.color.copy(_feWaterTmpDay).lerp(_feWaterTmpNight, nightMix);
        }
        for (let i = 0; i < farEastAlive.bridgeGlowMats.length; i++) {
            farEastAlive.bridgeGlowMats[i].opacity = nightMix * 0.92 * s1Alpha;
        }

        // 2. Движение парома Ванино — Холмск (скрывается, когда Татарский пролив закрыт ночным припаем)
        if (farEastAlive.ferryGroup && farEastAlive.ferryCurve) {
            const fastIceClosed = (typeof tatarIce !== 'undefined' && tatarIce.fastIceMix > 0.18);
            farEastAlive.ferryGroup.visible = !fastIceClosed;
            if (!fastIceClosed) {
                farEastAlive.ferryProgress += dt * 0.036 * farEastAlive.ferryDir;
                if (farEastAlive.ferryProgress >= 0.96) {
                    farEastAlive.ferryProgress = 0.96;
                    farEastAlive.ferryDir = -1;
                } else if (farEastAlive.ferryProgress <= 0.04) {
                    farEastAlive.ferryProgress = 0.04;
                    farEastAlive.ferryDir = 1;
                }
                const p = farEastAlive.ferryCurve.getPoint(farEastAlive.ferryProgress);
                const nextT = Math.max(0, Math.min(1, farEastAlive.ferryProgress + 0.02 * farEastAlive.ferryDir));
                const pNext = farEastAlive.ferryCurve.getPoint(nextT);
                farEastAlive.ferryGroup.position.set(p.x, 0.05 + Math.sin(elapsed * 2.2) * 0.014, p.z);
                farEastAlive.ferryGroup.lookAt(pNext.x, 0.05, pNext.z);
            }
        }

        // 3. Полёт 3D-самолётов по авиадугам ДВ
        for (let i = 0; i < farEastAlive.planes.length; i++) {
            const pl = farEastAlive.planes[i];
            pl.t += dt * pl.speed * pl.dir;
            if (pl.t >= 0.99) {
                pl.t = 0.99;
                pl.dir = -1;
            } else if (pl.t <= 0.01) {
                pl.t = 0.01;
                pl.dir = 1;
            }
            pl.curve.getPoint(pl.t, _fePlanePos);
            const nt = Math.max(0, Math.min(1, pl.t + 0.015 * pl.dir));
            pl.curve.getPoint(nt, _fePlaneNext);
            pl.mesh.position.copy(_fePlanePos);
            pl.mesh.lookAt(_fePlaneNext);

            const blink = Math.sin(elapsed * 7.5 + pl.phase) > 0.35 ? 1.0 : 0.15;
            pl.strobeMat.opacity = blink * (0.45 + nightMix * 0.55) * s1Alpha;
        }

        // 4. Анимация старта ракеты на космодроме «Восточный»
        const rk = farEastAlive.rocket;
        if (rk.group && rk.flame) {
            rk.cycleTime = (rk.cycleTime + dt) % rk.cycleDuration;
            const launchStart = 12.0;
            const launchEnd = 20.5;
            if (rk.cycleTime >= launchStart && rk.cycleTime <= launchEnd) {
                const lt = (rk.cycleTime - launchStart) / (launchEnd - launchStart);
                const lift = Math.pow(lt, 2.35) * 44.0;
                rk.group.visible = true;
                rk.group.position.set(0.15 + Math.pow(lt, 2.6) * 6.5, 0.24 + lift, 0.10);
                rk.group.rotation.z = -Math.pow(lt, 1.5) * 0.36;
                const fadeOut = lt > 0.78 ? Math.max(0.01, 1.0 - (lt - 0.78) / 0.22) : 1.0;
                rk.group.scale.setScalar(fadeOut);

                rk.flame.visible = true;
                rk.flame.scale.set(1.0, 0.85 + Math.sin(elapsed * 32) * 0.25, 1.0);
                rk.flame.material.opacity = 0.92 * fadeOut * s1Alpha;

                // Клубы дыма у стартового стола в первые секунды запуска
                for (let p = 0; p < rk.plumePuffs.length; p++) {
                    const pf = rk.plumePuffs[p];
                    const pt = (rk.cycleTime - launchStart - pf.delay) / 2.6;
                    if (pt > 0 && pt < 1) {
                        pf.mesh.visible = true;
                        const spread = pt * 2.6 * pf.drift;
                        pf.mesh.position.set(
                            0.15 + Math.cos(pf.ang) * spread,
                            0.45 + pt * 1.9,
                            0.10 + Math.sin(pf.ang) * spread
                        );
                        pf.mesh.scale.setScalar(0.55 + pt * 1.45);
                        pf.mat.opacity = (1.0 - pt) * 0.65 * s1Alpha;
                    } else {
                        pf.mesh.visible = false;
                    }
                }
            } else {
                // Ракета стоит на стартовом столе в ожидании запуска
                rk.group.visible = true;
                rk.group.position.set(0.15, 0.24, 0.10);
                rk.group.rotation.set(0, 0, 0);
                const appear = rk.cycleTime < 1.2 ? (rk.cycleTime / 1.2) : 1.0;
                rk.group.scale.setScalar(Math.max(0.01, appear));
                rk.flame.visible = false;
                for (let p = 0; p < rk.plumePuffs.length; p++) {
                    rk.plumePuffs[p].mesh.visible = false;
                }
            }
        }

        // 5. Дымок над вулканом Тятя (о. Кунашир)
        for (let i = 0; i < farEastAlive.volcanoPuffs.length; i++) {
            const vp = farEastAlive.volcanoPuffs[i];
            const t = (elapsed * 0.18 + vp.phase) % 1.0;
            vp.mesh.position.set(
                vp.baseX + t * 2.2 + Math.sin(elapsed + i) * 0.18,
                vp.baseY + t * 3.8,
                vp.baseZ - t * 1.1
            );
            vp.mesh.scale.setScalar(0.42 + t * 1.35);
            vp.mat.opacity = Math.sin(t * Math.PI) * 0.45 * s1Alpha;
        }

        // 6. Фонтаны гренландских китов у Шантарских островов (летом, пока море не замёрзло)
        for (let i = 0; i < farEastAlive.whaleSpouts.length; i++) {
            const ws = farEastAlive.whaleSpouts[i];
            if (isWinterMode) {
                ws.mesh.visible = false;
                continue;
            }
            const cycle = (elapsed * 0.32 + ws.phase) % 3.2;
            if (cycle < 1.0) {
                ws.mesh.visible = true;
                const s = Math.sin(cycle * Math.PI);
                ws.mesh.scale.set(0.75 + s * 0.45, Math.max(0.05, s * 1.15), 0.75 + s * 0.45);
                ws.mat.opacity = s * 0.72 * s1Alpha;
            } else {
                ws.mesh.visible = false;
            }
        }
    }

    // 7. Проекция DOM-меток природных памятников и 3D-символов ДВ (строго по Zoom LOD, скрыты на вкладке «Сахалин-3»)
    const camDist = (camera && controls) ? camera.position.distanceTo(controls.target) : 400;
    const mobileMult = isMobileViewport() ? 1.24 : 1.0;
    const showFeDetails = (activeProject === 'sakhalin1' || activeProject === 'shv') && areLabelsVisible && !isGlobeIntroActive && !(typeof goldMaster !== 'undefined' && goldMaster.cinemaMode) && camDist < 268 * mobileMult;
    const w = viewportWidth || window.innerWidth;
    const h = viewportHeight || window.innerHeight;

    for (let i = 0; i < farEastAlive.domLabels.length; i++) {
        const item = farEastAlive.domLabels[i];
        const allowed = showFeDetails && (item.kind === 'landmark' || isNatureVisible);
        if (!allowed) {
            if (item.visible) {
                item.el.style.display = 'none';
                item.visible = false;
            }
            continue;
        }
        _feProjVec.copy(item.worldPos).project(camera);
        if (_feProjVec.z > 1) {
            if (item.visible) {
                item.el.style.display = 'none';
                item.visible = false;
            }
            continue;
        }
        const sx = Math.round((_feProjVec.x * 0.5 + 0.5) * w);
        const sy = Math.round((-_feProjVec.y * 0.5 + 0.5) * h);
        if (sx < -80 || sx > w + 80 || sy < -40 || sy > h + 40) {
            if (item.visible) {
                item.el.style.display = 'none';
                item.visible = false;
            }
        } else {
            if (!item.visible) {
                item.el.style.display = 'flex';
                item.visible = true;
            }
            if (sx !== item.lastX || sy !== item.lastY) {
                item.el.style.transform = 'translate3d(' + sx + 'px, ' + sy + 'px, 0) translate(-50%, -100%)';
                item.lastX = sx;
                item.lastY = sy;
            }
        }
    }
}

