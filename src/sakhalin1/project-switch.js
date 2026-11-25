'use strict';

function ensureSakhalin1Built() {
    if (sakhalin1Built) return;
    sakhalin1Built = true;
    sakhalin1Group = new THREE.Group();
    scene.add(sakhalin1Group);

    buildFarEastMainland();
    buildFarEastBackdrop();
    buildSakhalin1FacilitiesAndShip();
    buildSakhalin1Pipelines();
    buildSakhalin1SubseaStructures();
    buildNeighborLandsAndKurils();
    buildSakhalin1Clouds();
    buildFarEastNightAtmosphere();
    buildSakhalin1SeaIce();
    buildFarEastTaiga();
    createSakhalin1DomMarkers();
    buildSakhalin1NauticalGrid();
    buildFarEastAlive();
    if (typeof syncSakhalin3RusskyGrs === 'function') {
        syncSakhalin3RusskyGrs();
    }
    if (typeof updateDomMarkersForLang === 'function') {
        updateDomMarkersForLang();
    }
    syncProjectVisualTargets(true);
    snapMainlandFade(activeProject === 'sakhalin1' || activeProject === 'shv');
    applyFarEastProjectVisibility();
}

// Режим «Соседние проекты на фоне»: вместо скрытия других проектов мягко приглушаем их до 26% (управляется из «Настроек»)
let showBackgroundProjects = true;
try {
    const savedBg = localStorage.getItem('sakhalin_bg_projects');
    if (savedBg === '0') showBackgroundProjects = false;
} catch (_) {}
const BG_PROJECT_DIM_ALPHA = 0.26;
const ISLAND_ONLY_S1_IDS = new Set(['s1-odoptu', 's1-berkut', 's1-orlan', 's1-chayvo', 's3-pdk', 's3-south-kirinskoye', 's3-btk', 's3-gks']);
const ISLAND_ONLY_S1_PIPES = new Set(['s1-shelf', 's3-subsea']);

function applyLocalDimEntries(entries, dimAlpha, disableDepthWriteDuringFade = false) {
    if (!entries) return;
    const a = Math.max(0, Math.min(1, dimAlpha));
    const isDim = a < 0.992;
    for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const wantTrans = isDim ? true : e.origTransparent;
        if (e.mat.transparent !== wantTrans) {
            e.mat.transparent = wantTrans;
            e.mat.needsUpdate = true;
        }
        if (disableDepthWriteDuringFade) {
            const wantDW = isDim ? false : e.origDepthWrite;
            if (e.mat.depthWrite !== wantDW) e.mat.depthWrite = wantDW;
        }
        e.mat.opacity = isDim ? (e.origOpacity * a) : e.origOpacity;
    }
}

// Плавные альфы каждого проекта (0..1) для мягкого появления/исчезновения ВСЕХ проектов без рывков
const projectVisualFade = {
    active: false,
    alpha: { sakhalin2: 1, sakhalin1: 0, sakhalin3: 0, shv: 0 },
    target: { sakhalin2: 1, sakhalin1: 0, sakhalin3: 0, shv: 0 }
};

function getFacilityProjectKey(facId) {
    if (typeof PROJECT_FACILITY_IDS !== 'undefined') {
        if (PROJECT_FACILITY_IDS.sakhalin1 && PROJECT_FACILITY_IDS.sakhalin1.includes(facId)) return 'sakhalin1';
        if (PROJECT_FACILITY_IDS.sakhalin3 && PROJECT_FACILITY_IDS.sakhalin3.includes(facId)) return 'sakhalin3';
        if (PROJECT_FACILITY_IDS.shv && PROJECT_FACILITY_IDS.shv.includes(facId)) return 'shv';
    }
    return 'sakhalin1';
}

function getPipeProjectKey(chainTag) {
    if (typeof PROJECT_DEFAULT_PIPES !== 'undefined') {
        if (PROJECT_DEFAULT_PIPES.sakhalin1 && PROJECT_DEFAULT_PIPES.sakhalin1.includes(chainTag)) return 'sakhalin1';
        if (PROJECT_DEFAULT_PIPES.sakhalin3 && PROJECT_DEFAULT_PIPES.sakhalin3.includes(chainTag)) return 'sakhalin3';
        if (PROJECT_DEFAULT_PIPES.shv && PROJECT_DEFAULT_PIPES.shv.includes(chainTag)) return 'shv';
    }
    return 'sakhalin1';
}

function syncProjectVisualTargets(snapNow = false) {
    const bgVal = showBackgroundProjects ? BG_PROJECT_DIM_ALPHA : 0.0;
    const keys = ['sakhalin2', 'sakhalin1', 'sakhalin3', 'shv'];
    let needsFade = false;
    for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const tgt = (activeProject === k) ? 1.0 : bgVal;
        projectVisualFade.target[k] = tgt;
        if (snapNow) {
            projectVisualFade.alpha[k] = tgt;
        } else if (Math.abs(projectVisualFade.alpha[k] - tgt) > 0.004) {
            needsFade = true;
        }
    }
    projectVisualFade.active = !snapNow && needsFade;
}

// Видимость и плавное приглушение объектов «Сахалин-1 / Сахалин-3 / СХВ»
function applyFarEastProjectVisibility() {
    if (!sakhalin1Built) return;
    const isFE = isFarEastProject();
    const showMainland = (activeProject === 'sakhalin1' || activeProject === 'shv');
    const mlVisA = (typeof mainlandFade !== 'undefined') ? Math.pow(Math.max(0, Math.min(1, mainlandFade.alpha)), 1.65) : (showMainland ? 1 : 0);
    const activeIds = (isFE && typeof PROJECT_FACILITY_IDS !== 'undefined' && PROJECT_FACILITY_IDS[activeProject])
        ? PROJECT_FACILITY_IDS[activeProject]
        : [];
    const activePipes = (isFE && typeof PROJECT_DEFAULT_PIPES !== 'undefined' && PROJECT_DEFAULT_PIPES[activeProject])
        ? PROJECT_DEFAULT_PIPES[activeProject]
        : [];

    // 1. 3D-модели объектов на карте (плавный переход между 0%, 26% и 100%, материковые — синхронно с материком!)
    s1FacilityModelsMap.forEach((entry, id) => {
        if (!entry || !entry.group) return;
        const isShip = (id === 's1-tanker-dekastri');
        if (isShip) {
            const shipA = (activeProject === 'sakhalin1') ? Math.min(projectVisualFade.alpha.sakhalin1, mlVisA) : 0;
            entry.group.visible = shipA > 0.02;
            return;
        }
        const pKey = getFacilityProjectKey(id);
        let effA = projectVisualFade.alpha[pKey] !== undefined ? projectVisualFade.alpha[pKey] : 0;
        if (!ISLAND_ONLY_S1_IDS.has(id)) {
            effA *= mlVisA;
        }
        if (effA <= 0.01) {
            entry.group.visible = false;
        } else {
            if (!entry._fadeMats) entry._fadeMats = collectFadeMaterials(entry.group);
            entry.group.visible = true;
            applyLocalDimEntries(entry._fadeMats, effA, false);
            if (entry.selectionRing) entry.selectionRing.visible = isFE && activeIds.includes(id) && effA > 0.55;
        }
    });

    // 2. Судно «Танкер S1» и его маршрут — только в активном «Сахалин-1» (проявляется вместе с материком)
    const showS1Ship = activeProject === 'sakhalin1' && mlVisA > 0.06;
    for (let i = 0; i < s1MovingShips.length; i++) {
        const sh = s1MovingShips[i];
        if (sh.group) sh.group.visible = showS1Ship;
        if (sh.routeLine) sh.routeLine.visible = showS1Ship;
        if (sh.transferGroup && !showS1Ship) sh.transferGroup.visible = false;
    }

    // 3. Трубопроводы (плавный переход прозрачности синхронно с проектами и материком)
    for (let i = 0; i < s1PipelineSegments.length; i++) {
        const seg = s1PipelineSegments[i];
        if (!seg || !seg.mesh) continue;
        const pKey = getPipeProjectKey(seg.chainTag);
        let effA = projectVisualFade.alpha[pKey] !== undefined ? projectVisualFade.alpha[pKey] : 0;
        if (!ISLAND_ONLY_S1_PIPES.has(seg.chainTag)) {
            effA *= mlVisA;
        }
        if (effA <= 0.01) {
            seg.mesh.visible = false;
        } else {
            seg.mesh.visible = true;
            if (seg.mat) {
                const wantT = effA < 0.99;
                if (seg.mat.transparent !== wantT) {
                    seg.mat.transparent = wantT;
                    seg.mat.needsUpdate = true;
                }
                seg.mat.opacity = effA;
                if (effA < 0.5) seg.mat.emissiveIntensity = 0.0;
            }
        }
    }
    for (let i = 0; i < s1PipelineFlowParticles.length; i++) {
        const p = s1PipelineFlowParticles[i];
        if (p && p.mesh) {
            const pKey = getPipeProjectKey(p.chainTag);
            let effA = projectVisualFade.alpha[pKey] !== undefined ? projectVisualFade.alpha[pKey] : 0;
            if (!ISLAND_ONLY_S1_PIPES.has(p.chainTag)) effA *= mlVisA;
            p.mesh.visible = isFlowEnabled && isFE && activePipes.includes(p.chainTag) && effA > 0.45;
        }
    }

    // 4. Дополнительные 3D-элементы (башня ВПУ, подводные подгруппы S1 / S3 / СХВ)
    if (typeof s1ProjectExtraObjects !== 'undefined') {
        for (let i = 0; i < s1ProjectExtraObjects.length; i++) {
            const item = s1ProjectExtraObjects[i];
            if (!item || !item.mesh) continue;
            const isIslandExtra = item.projects.includes('sakhalin3');
            let bestA = 0;
            for (let j = 0; j < item.projects.length; j++) {
                const pk = item.projects[j];
                if (projectVisualFade.alpha[pk] !== undefined && projectVisualFade.alpha[pk] > bestA) {
                    bestA = projectVisualFade.alpha[pk];
                }
            }
            if (!isIslandExtra) bestA *= mlVisA;
            if (bestA <= 0.01) {
                item.mesh.visible = false;
            } else {
                if (!item._fadeMats) item._fadeMats = collectFadeMaterials(item.mesh);
                item.mesh.visible = true;
                applyLocalDimEntries(item._fadeMats, bestA, false);
            }
        }
    }

    // 5. Состояние судов, колец и потоков «Сахалин-2» (когда S2 в приглушённом фоне, скрываем его суету)
    const isS2Active = (activeProject === 'sakhalin2');
    if (typeof movingShips !== 'undefined') {
        for (let i = 0; i < movingShips.length; i++) {
            const sh = movingShips[i];
            if (sh.group) sh.group.visible = isS2Active;
            if (sh.routeLine) sh.routeLine.visible = isS2Active;
        }
    }
    if (typeof pipelineFlowParticles !== 'undefined') {
        for (let i = 0; i < pipelineFlowParticles.length; i++) {
            const p = pipelineFlowParticles[i];
            if (p && p.mesh) p.mesh.visible = isFlowEnabled && isS2Active;
        }
    }
    if (typeof facilityModelsMap !== 'undefined') {
        facilityModelsMap.forEach((entry, id) => {
            if (!entry || !entry.selectionRing) return;
            if (id === 'aniva-lighthouse') {
                entry.selectionRing.visible = isS2Active;
            } else {
                entry.selectionRing.visible = isS2Active;
            }
        });
    }

    // 6. Материк ДВ управляется строго через startMainlandFade / snapMainlandFade (не сбрасываем его здесь!)
}

function toggleBackgroundProjects(forceState) {
    showBackgroundProjects = (typeof forceState === 'boolean') ? forceState : !showBackgroundProjects;
    try { localStorage.setItem('sakhalin_bg_projects', showBackgroundProjects ? '1' : '0'); } catch (_) {}
    if (showBackgroundProjects && !sakhalin1Built) {
        ensureSakhalin1Built();
    }
    const isS1 = isFarEastProject();
    syncProjectVisualTargets(true);
    snapProjectCrossfade(isS1);
    applyFarEastProjectVisibility();
    highlightPipelineChain(activeFacilityId || null);
    if (typeof syncSettingsModalUI === 'function') syncSettingsModalUI();
    const en = (typeof isEn === 'function' && isEn());
    showToast(showBackgroundProjects
        ? (en ? 'Neighbor projects shown dimmed' : 'Соседние проекты показаны на фоне')
        : (en ? 'Showing active project only' : 'Показан только текущий проект'));
}

function getActiveFacilitiesList() {
    if (!isFarEastProject()) return FACILITIES_DATA;
    const ids = (typeof PROJECT_FACILITY_IDS !== 'undefined') ? PROJECT_FACILITY_IDS[activeProject] : null;
    if (!ids) return SAKHALIN1_FACILITIES_DATA;
    return ids.map(id => SAKHALIN1_FACILITIES_DATA.find(f => f.id === id)).filter(Boolean);
}

function getActiveMovingShips() {
    if (activeProject === 'sakhalin1') return s1MovingShips;
    if (activeProject === 'sakhalin2') return movingShips;
    return [];
}

function getActiveTourStops() {
    if (activeProject === 'sakhalin1') return SAKHALIN1_TOUR_STOP_IDS;
    if (activeProject === 'sakhalin3') return SAKHALIN3_TOUR_STOP_IDS;
    if (activeProject === 'shv') return SHV_TOUR_STOP_IDS;
    return TOUR_STOP_IDS;
}

// =========================================================================
// ПЛАВНЫЙ КРОССФЕЙД ПРОЕКТОВ «САХАЛИН-1» <-> «САХАЛИН-2» БЕЗ РЕЗКИХ СКАЧКОВ
// =========================================================================
const projectCrossfade = {
    active: false,
    s1Alpha: 0,
    s2Alpha: 1,
    s1Start: 0,
    s1Target: 0,
    s1Elapsed: 0,
    s1Delay: 0,
    s1Duration: 1.1,
    s2Start: 1,
    s2Target: 1,
    s2Elapsed: 0,
    s2Delay: 0,
    s2Duration: 0.9,
    s1Entries: null,
    s2Entries: null
};

// Собираем уникальные видимые материалы внутри группы один раз для мгновенного плавного фейда
function collectFadeMaterials(rootGroup) {
    if (!rootGroup) return [];
    const seen = new Set();
    const list = [];
    rootGroup.traverse(obj => {
        if (!obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (let i = 0; i < mats.length; i++) {
            const m = mats[i];
            if (!m || seen.has(m) || m.visible === false) continue;
            // Материалы ночного свечения и льдин управляются отдельно с учётом сезона/ночи
            if (
                m === s1CityLightsMat ||
                m === s1NightHalosMat ||
                m === s1NeighborLightsMat ||
                (s1SeaIceMesh && m === s1SeaIceMesh.material)
            ) {
                continue;
            }
            seen.add(m);
            list.push({
                mat: m,
                origTransparent: Boolean(m.transparent),
                origOpacity: m.opacity !== undefined ? m.opacity : 1.0,
                origDepthWrite: m.depthWrite !== undefined ? Boolean(m.depthWrite) : true
            });
        }
    });
    return list;
}

function applyGroupFadeAlpha(group, entries, alpha, isS1Group) {
    if (!group) return;
    const a = Math.max(0, Math.min(1, alpha));
    if (a <= 0.004) {
        group.visible = false;
        return;
    }
    group.visible = true;
    const isFading = a < 0.996;

    if (entries) {
        const mlSet = (isS1Group && typeof mainlandFade !== 'undefined') ? mainlandFade.matSet : null;
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            if (mlSet && mlSet.has(e.mat)) continue;
            const wantTransparent = isFading ? true : e.origTransparent;
            if (e.mat.transparent !== wantTransparent) {
                e.mat.transparent = wantTransparent;
                e.mat.needsUpdate = true;
            }
            e.mat.opacity = isFading ? (e.origOpacity * a) : e.origOpacity;
        }
    }

    if (isS1Group) {
        const mlAlpha = (typeof mainlandFade !== 'undefined') ? mainlandFade.alpha : ((activeProject === 'sakhalin1' || activeProject === 'shv') ? 1 : 0);
        const effMainland = a * mlAlpha;
        if (s1SeaIceMesh && s1SeaIceMesh.material) {
            const wMix = (typeof winterMix !== 'undefined') ? winterMix : (isWinterMode ? 1.0 : 0.0);
            const iceTarget = wMix * wMix * (3.0 - 2.0 * wMix);
            s1SeaIceMesh.visible = iceTarget > 0.015 && effMainland > 0.02;
            s1SeaIceMesh.material.opacity = iceTarget * effMainland;
        }
        if (s1CityLightsGroup && s1CityLightsMat) {
            s1CityLightsGroup.visible = (nightMix > 0.03) && effMainland > 0.02;
            s1CityLightsMat.opacity = nightMix * 0.92 * effMainland;
        }
        if (s1NightHalosGroup && s1NightHalosMat) {
            s1NightHalosGroup.visible = (nightMix > 0.03) && effMainland > 0.02;
            s1NightHalosMat.opacity = nightMix * 0.88 * effMainland;
        }
        if (s1NeighborLightsGroup && s1NeighborLightsMat) {
            s1NeighborLightsGroup.visible = (nightMix > 0.03) && effMainland > 0.02;
            s1NeighborLightsMat.opacity = nightMix * 0.90 * effMainland;
        }
        // Сохраняем приглушение фоновых проектов поверх общего кроссфейда
        if (a > 0.02) {
            applyFarEastProjectVisibility();
        }
        if (typeof mainlandFade !== 'undefined' && sakhalin1Built) {
            applyMainlandFadeAlpha(mainlandFade.alpha);
        }
    }
}

function ensureCrossfadeCaches() {
    if (!projectCrossfade.s2Entries && sakhalin2Group) {
        projectCrossfade.s2Entries = collectFadeMaterials(sakhalin2Group);
    }
    if (!projectCrossfade.s1Entries && sakhalin1Built && sakhalin1Group) {
        projectCrossfade.s1Entries = collectFadeMaterials(sakhalin1Group);
    }
}

function snapProjectCrossfade(isS1) {
    ensureCrossfadeCaches();
    projectCrossfade.active = false;
    projectCrossfade.s1Alpha = isS1 ? 1 : (showBackgroundProjects ? 1 : 0);
    projectCrossfade.s2Alpha = isS1 ? (showBackgroundProjects ? BG_PROJECT_DIM_ALPHA : 0) : 1;
    projectCrossfade.s1Target = projectCrossfade.s1Alpha;
    projectCrossfade.s2Target = projectCrossfade.s2Alpha;
    applyGroupFadeAlpha(sakhalin2Group, projectCrossfade.s2Entries, projectCrossfade.s2Alpha, false);
    if (sakhalin1Built) {
        applyGroupFadeAlpha(sakhalin1Group, projectCrossfade.s1Entries, projectCrossfade.s1Alpha, true);
    }
}

function startProjectCrossfade(isS1) {
    ensureCrossfadeCaches();
    projectCrossfade.active = true;
    projectCrossfade.s1Start = projectCrossfade.s1Alpha;
    projectCrossfade.s2Start = projectCrossfade.s2Alpha;
    projectCrossfade.s1Target = isS1 ? 1 : (showBackgroundProjects ? 1 : 0);
    projectCrossfade.s2Target = isS1 ? (showBackgroundProjects ? BG_PROJECT_DIM_ALPHA : 0) : 1;
    projectCrossfade.s1Elapsed = 0;
    projectCrossfade.s2Elapsed = 0;

    if (isS1) {
        // Сахалин-2 -> Сахалин-1: материк плавно проявляется по мере отдаления камеры
        projectCrossfade.s1Delay = 0.08;
        projectCrossfade.s1Duration = 1.15;
        projectCrossfade.s2Delay = 0.12;
        projectCrossfade.s2Duration = 0.85;
    } else {
        // Сахалин-1 -> Сахалин-2: ДВ остаётся на месте в начале полёта, затем мягко растворяется
        projectCrossfade.s1Delay = 0.30;
        projectCrossfade.s1Duration = 1.35;
        projectCrossfade.s2Delay = 0.35;
        projectCrossfade.s2Duration = 1.05;
    }

    // Применяем текущее состояние без резкого скачка на кадре 0
    applyGroupFadeAlpha(sakhalin2Group, projectCrossfade.s2Entries, projectCrossfade.s2Alpha, false);
    if (sakhalin1Built) {
        applyGroupFadeAlpha(sakhalin1Group, projectCrossfade.s1Entries, projectCrossfade.s1Alpha, true);
    }
}

// Плавное появление / исчезновение материка Дальнего Востока (земля, фон, соседи, лес, реки, острова)
const mainlandFade = {
    active: false,
    alpha: 0,
    start: 0,
    target: 0,
    elapsed: 0,
    delay: 0,
    duration: 2.05,
    entries: null,
    matSet: null
};

function getMainlandRootList() {
    const roots = [];
    if (s1MainlandMesh) roots.push(s1MainlandMesh);
    if (s1BackdropGroup) roots.push(s1BackdropGroup);
    if (s1NeighborsGroup) roots.push(s1NeighborsGroup);
    if (s1TaigaMesh) roots.push(s1TaigaMesh);
    if (s1TaigaPoints) roots.push(s1TaigaPoints);
    if (typeof farEastAlive !== 'undefined') {
        if (farEastAlive.group) roots.push(farEastAlive.group);
        if (farEastAlive.ferryGroup) roots.push(farEastAlive.ferryGroup);
    }
    if (window.s1ShantarGroup) roots.push(window.s1ShantarGroup);
    return roots;
}

function ensureMainlandFadeCache() {
    if (mainlandFade.entries || !sakhalin1Built) return;
    const seen = new Set();
    const list = [];
    getMainlandRootList().forEach(root => {
        const sub = collectFadeMaterials(root);
        for (let i = 0; i < sub.length; i++) {
            if (!seen.has(sub[i].mat)) {
                seen.add(sub[i].mat);
                list.push(sub[i]);
            }
        }
    });
    mainlandFade.entries = list;
    mainlandFade.matSet = seen;
}

function applyMainlandFadeAlpha(alpha) {
    if (!sakhalin1Built) return;
    ensureMainlandFadeCache();
    const a = Math.max(0, Math.min(1, alpha));
    const s1A = (typeof projectCrossfade !== 'undefined') ? projectCrossfade.s1Alpha : 1;
    const effA = a * s1A;
    const vis = effA > 0.004;
    const isFading = vis && effA < 0.996;
    // Перцептивная кривая (pow 1.9), чтобы многослойный материк не казался непрозрачным уже на 20%
    const visualA = isFading ? Math.pow(effA, 1.9) : effA;

    if (s1MainlandMesh) s1MainlandMesh.visible = vis;
    if (s1BackdropGroup) s1BackdropGroup.visible = vis;
    if (s1NeighborsGroup) s1NeighborsGroup.visible = vis;
    if (typeof farEastAlive !== 'undefined') {
        if (farEastAlive.group) farEastAlive.group.visible = vis;
        if (farEastAlive.ferryGroup) farEastAlive.ferryGroup.visible = vis;
    }
    if (window.s1ShantarGroup) window.s1ShantarGroup.visible = vis;
    if (!vis) {
        if (s1TaigaMesh) s1TaigaMesh.visible = false;
        if (s1TaigaPoints) s1TaigaPoints.visible = false;
    }

    if (mainlandFade.entries && vis) {
        for (let i = 0; i < mainlandFade.entries.length; i++) {
            const e = mainlandFade.entries[i];
            const wantTransparent = isFading ? true : e.origTransparent;
            if (e.mat.transparent !== wantTransparent) {
                e.mat.transparent = wantTransparent;
                e.mat.needsUpdate = true;
            }
            const wantDW = isFading ? false : e.origDepthWrite;
            if (e.mat.depthWrite !== wantDW) {
                e.mat.depthWrite = wantDW;
            }
            e.mat.opacity = isFading ? (e.origOpacity * visualA) : e.origOpacity;
        }
    }

    if (s1SeaIceMesh && s1SeaIceMesh.material) {
        const wMix = (typeof winterMix !== 'undefined') ? winterMix : (isWinterMode ? 1.0 : 0.0);
        const iceTarget = wMix * wMix * (3.0 - 2.0 * wMix);
        s1SeaIceMesh.visible = iceTarget > 0.015 && visualA > 0.02;
        s1SeaIceMesh.material.opacity = iceTarget * visualA;
    }
    if (s1CityLightsGroup && s1CityLightsMat) {
        s1CityLightsGroup.visible = (nightMix > 0.03) && visualA > 0.02;
        s1CityLightsMat.opacity = nightMix * 0.92 * visualA;
    }
    if (s1NightHalosGroup && s1NightHalosMat) {
        s1NightHalosGroup.visible = (nightMix > 0.03) && visualA > 0.02;
        s1NightHalosMat.opacity = nightMix * 0.88 * visualA;
    }
    if (s1NeighborLightsGroup && s1NeighborLightsMat) {
        s1NeighborLightsGroup.visible = (nightMix > 0.03) && visualA > 0.02;
        s1NeighborLightsMat.opacity = nightMix * 0.90 * visualA;
    }
}

function snapMainlandFade(showMainland) {
    if (!sakhalin1Built) return;
    mainlandFade.active = false;
    mainlandFade.alpha = showMainland ? 1 : 0;
    mainlandFade.target = mainlandFade.alpha;
    applyMainlandFadeAlpha(mainlandFade.alpha);
}

function startMainlandFade(showMainland, duration = 2.05) {
    if (!sakhalin1Built) return;
    ensureMainlandFadeCache();
    const target = showMainland ? 1 : 0;
    if (Math.abs(mainlandFade.alpha - target) < 0.005) {
        snapMainlandFade(showMainland);
        return;
    }
    mainlandFade.active = true;
    mainlandFade.start = mainlandFade.alpha;
    mainlandFade.target = target;
    mainlandFade.elapsed = 0;
    mainlandFade.delay = showMainland ? 0.18 : 0.0;
    mainlandFade.duration = duration;
    applyMainlandFadeAlpha(mainlandFade.alpha);
}

function updateProjectCrossfade(dt) {
    if (projectVisualFade.active) {
        const keys = ['sakhalin2', 'sakhalin1', 'sakhalin3', 'shv'];
        let stillMoving = false;
        const step = Math.min(1, dt * 2.4);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const cur = projectVisualFade.alpha[k];
            const tgt = projectVisualFade.target[k];
            const diff = tgt - cur;
            if (Math.abs(diff) <= 0.004) {
                projectVisualFade.alpha[k] = tgt;
            } else {
                projectVisualFade.alpha[k] = cur + diff * step;
                stillMoving = true;
            }
        }
        projectVisualFade.active = stillMoving;
        if (sakhalin1Built) {
            applyFarEastProjectVisibility();
        }
    }
    if (mainlandFade.active && sakhalin1Built) {
        mainlandFade.elapsed += dt;
        const tRaw = (mainlandFade.elapsed - (mainlandFade.delay || 0)) / mainlandFade.duration;
        const tm = Math.max(0, Math.min(1, tRaw));
        const em = tm * tm * (3 - 2 * tm);
        mainlandFade.alpha = mainlandFade.start + (mainlandFade.target - mainlandFade.start) * em;
        applyMainlandFadeAlpha(mainlandFade.alpha);
        applyFarEastProjectVisibility();
        if (tm >= 1) {
            mainlandFade.active = false;
            mainlandFade.alpha = mainlandFade.target;
            applyMainlandFadeAlpha(mainlandFade.alpha);
            applyFarEastProjectVisibility();
        }
    }
    if (!projectCrossfade.active) return;
    projectCrossfade.s1Elapsed += dt;
    projectCrossfade.s2Elapsed += dt;

    const t1 = Math.max(0, Math.min(1, (projectCrossfade.s1Elapsed - projectCrossfade.s1Delay) / projectCrossfade.s1Duration));
    const t2 = Math.max(0, Math.min(1, (projectCrossfade.s2Elapsed - projectCrossfade.s2Delay) / projectCrossfade.s2Duration));

    const e1 = t1 * t1 * (3 - 2 * t1);
    const e2 = t2 * t2 * (3 - 2 * t2);

    projectCrossfade.s1Alpha = projectCrossfade.s1Start + (projectCrossfade.s1Target - projectCrossfade.s1Start) * e1;
    projectCrossfade.s2Alpha = projectCrossfade.s2Start + (projectCrossfade.s2Target - projectCrossfade.s2Start) * e2;

    applyGroupFadeAlpha(sakhalin2Group, projectCrossfade.s2Entries, projectCrossfade.s2Alpha, false);
    if (sakhalin1Built) {
        applyGroupFadeAlpha(sakhalin1Group, projectCrossfade.s1Entries, projectCrossfade.s1Alpha, true);
    }

    if (t1 >= 1 && t2 >= 1) {
        projectCrossfade.active = false;
        projectCrossfade.s1Alpha = projectCrossfade.s1Target;
        projectCrossfade.s2Alpha = projectCrossfade.s2Target;
        applyGroupFadeAlpha(sakhalin2Group, projectCrossfade.s2Entries, projectCrossfade.s2Alpha, false);
        if (sakhalin1Built) {
            applyGroupFadeAlpha(sakhalin1Group, projectCrossfade.s1Entries, projectCrossfade.s1Alpha, true);
        }
    }
}

function switchProjectTab(projectKey) {
    if (projectKey !== 'sakhalin1' && projectKey !== 'sakhalin2' && projectKey !== 'sakhalin3' && projectKey !== 'shv') return;
    if (activeProject === projectKey) return;

    const prevProject = activeProject;
    const wasFarEast = isFarEastProject(prevProject);

    if (tourState.active) stopAutoTour(false);
    closeDetailCard();
    closeMobileSidebar();

    activeProject = projectKey;
    const isS1 = isFarEastProject(activeProject);

    const hadMainland = (prevProject === 'sakhalin1' || prevProject === 'shv');
    const wantMainland = (activeProject === 'sakhalin1' || activeProject === 'shv');

    if (isS1) {
        const justBuilt = !sakhalin1Built;
        ensureSakhalin1Built();
        if (justBuilt && !isGlobeIntroActive && !isReturningToGlobe) {
            // При первом построении начинаем строго с прозрачности 0, чтобы материк проявился плавно!
            snapMainlandFade(hadMainland);
        }
    }
    if (isGlobeIntroActive || isReturningToGlobe) {
        syncProjectVisualTargets(true);
        snapMainlandFade(wantMainland);
        snapProjectCrossfade(isS1);
    } else {
        syncProjectVisualTargets(false);
        startMainlandFade(wantMainland, wantMainland ? 2.05 : 1.85);
        if (wasFarEast !== isS1) {
            startProjectCrossfade(isS1);
        }
    }

    // При переходе на «Сахалин-3» автоматически включаем подводный вид (чтобы сразу видеть ПДК на дне моря),
    // а при выходе с «Сахалин-3» на обычные вкладки мягко возвращаем стандартную поверхность океана
    if (activeProject === 'sakhalin3' && !isSubseaMode && typeof toggleSubseaMode === 'function') {
        toggleSubseaMode(true);
    } else if (prevProject === 'sakhalin3' && activeProject !== 'sakhalin3' && isSubseaMode && typeof toggleSubseaMode === 'function') {
        toggleSubseaMode(false);
    }

    if (nauticalGridGroup) {
        nauticalGridGroup.visible = isGridVisible && !isS1;
    }
    if (s1NauticalGridGroup) {
        s1NauticalGridGroup.visible = isGridVisible && isS1;
    }
    if (subseaS2Group) {
        subseaS2Group.visible = !isS1;
    }
    if (s1SubseaGroup) {
        s1SubseaGroup.visible = isSubseaMode;
    }
    if (subseaSeabedMesh) {
        subseaSeabedMesh.scale.set(isS1 ? 3.2 : 1.0, isS1 ? 3.2 : 1.0, 1.0);
    }
    const anivaEntry = facilityModelsMap.get('aniva-lighthouse');
    if (anivaEntry) {
        anivaEntry.selectionRing.visible = !isS1;
    }

    if (waterMesh) {
        waterMesh.scale.set(3.2, 3.2, 1.0);
    }
    if (waterUniforms) {
        waterUniforms.uFarEastMix.value = 1.0;
    }
    const isWideFarEast = (activeProject === 'sakhalin1' || activeProject === 'shv');
    if (scene && scene.fog) {
        scene.fog.density = isWideFarEast ? 0.00052 : 0.00095;
    }
    if (camera) {
        camera.far = 2400;
        camera.updateProjectionMatrix();
    }

    if (controls) {
        controls.maxDistance = isWideFarEast ? 920 : 420;
    }

    const activeClsMap = {
        sakhalin2: 'active-s2',
        sakhalin1: 'active-s1',
        sakhalin3: 'active-s3',
        shv: 'active-shv'
    };
    document.querySelectorAll('.project-tab-btn').forEach(btn => {
        const isTarget = btn.dataset.project === activeProject;
        btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        btn.classList.remove('active-s2', 'active-s1', 'active-s3', 'active-shv', 'text-slate-300', 'hover:text-white');
        if (isTarget) {
            btn.classList.add(activeClsMap[activeProject] || 'active-s2');
        } else {
            btn.classList.add('text-slate-300', 'hover:text-white');
        }
    });

    const brandSub = document.getElementById('header-brand-sub');
    const brandTitle = document.getElementById('header-brand-title');
    const resetText = document.getElementById('desktop-reset-text');
    const headerMeta = {
        sakhalin2: {
            sub: 'Сахалинская Энергия',
            title: 'о. Сахалин — «Сахалин-2»',
            reset: 'Обзор',
            accent: '#34d399', wave: '#a7f3d0', dot: '#6ee7b7',
            cssAccent: '#10b981', cssSoft: 'rgba(16,185,129,0.18)', cssBorder: 'rgba(52,211,153,0.48)', cssGlow: 'rgba(16,185,129,0.24)', cssText: '#6ee7b7',
            bg: 'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(15,23,42,0.92))',
            border: 'rgba(52,211,153,0.55)', glow: '0 0 18px rgba(16,185,129,0.28)',
            subCls: 'text-emerald-400', badgeBg: 'rgba(16,185,129,0.20)', badgeText: '#6ee7b7', badgeBorder: 'rgba(52,211,153,0.35)'
        },
        sakhalin1: {
            sub: 'Шельф и экспорт нефти',
            title: 'Проект «Сахалин-1»',
            reset: 'Обзор',
            accent: '#fb923c', wave: '#fed7aa', dot: '#fdba74',
            cssAccent: '#f97316', cssSoft: 'rgba(249,115,22,0.18)', cssBorder: 'rgba(251,146,60,0.50)', cssGlow: 'rgba(249,115,22,0.26)', cssText: '#fdba74',
            bg: 'linear-gradient(135deg, rgba(249,115,22,0.24), rgba(15,23,42,0.92))',
            border: 'rgba(251,146,60,0.58)', glow: '0 0 18px rgba(249,115,22,0.30)',
            subCls: 'text-orange-400', badgeBg: 'rgba(249,115,22,0.20)', badgeText: '#fdba74', badgeBorder: 'rgba(251,146,60,0.38)'
        },
        sakhalin3: {
            sub: 'Подводная добыча • ПДК',
            title: 'Проект «Сахалин-3»',
            reset: 'Обзор',
            accent: '#38bdf8', wave: '#bae6fd', dot: '#7dd3fc',
            cssAccent: '#38bdf8', cssSoft: 'rgba(56,189,248,0.18)', cssBorder: 'rgba(56,189,248,0.50)', cssGlow: 'rgba(56,189,248,0.26)', cssText: '#7dd3fc',
            bg: 'linear-gradient(135deg, rgba(56,189,248,0.24), rgba(15,23,42,0.92))',
            border: 'rgba(56,189,248,0.58)', glow: '0 0 18px rgba(56,189,248,0.30)',
            subCls: 'text-sky-400', badgeBg: 'rgba(56,189,248,0.20)', badgeText: '#7dd3fc', badgeBorder: 'rgba(56,189,248,0.38)'
        },
        shv: {
            sub: 'Магистральный газопровод',
            title: 'МГП Сахалин — Владивосток',
            reset: 'Обзор',
            accent: '#f87171', wave: '#fecaca', dot: '#fca5a5',
            cssAccent: '#ef4444', cssSoft: 'rgba(239,68,68,0.18)', cssBorder: 'rgba(248,113,113,0.50)', cssGlow: 'rgba(239,68,68,0.26)', cssText: '#fca5a5',
            bg: 'linear-gradient(135deg, rgba(239,68,68,0.24), rgba(15,23,42,0.92))',
            border: 'rgba(248,113,113,0.58)', glow: '0 0 18px rgba(239,68,68,0.30)',
            subCls: 'text-red-400', badgeBg: 'rgba(239,68,68,0.20)', badgeText: '#fca5a5', badgeBorder: 'rgba(248,113,113,0.38)'
        }
    }[activeProject];
    if (document.documentElement && headerMeta) {
        const rs = document.documentElement.style;
        rs.setProperty('--proj-accent', headerMeta.cssAccent);
        rs.setProperty('--proj-accent-soft', headerMeta.cssSoft);
        rs.setProperty('--proj-accent-border', headerMeta.cssBorder);
        rs.setProperty('--proj-accent-glow', headerMeta.cssGlow);
        rs.setProperty('--proj-accent-text', headerMeta.cssText);
    }
    if (brandSub) {
        brandSub.textContent = headerMeta.sub;
        brandSub.classList.remove('text-emerald-400', 'text-orange-400', 'text-sky-400', 'text-red-400', 'text-amber-400');
        brandSub.classList.add(headerMeta.subCls);
    }
    if (brandTitle) brandTitle.textContent = headerMeta.title;
    if (resetText) resetText.textContent = headerMeta.reset;

    // Динамическая подсветка логотипа в цвет активного проекта
    const logoBox = document.getElementById('brand-logo-box');
    const logoRing = document.getElementById('brand-logo-ring');
    const logoIsland = document.getElementById('brand-logo-island');
    const logoWave = document.getElementById('brand-logo-wave');
    const logoDot = document.getElementById('brand-logo-dot');
    const badge3d = document.getElementById('brand-badge-3d');
    if (logoBox) {
        logoBox.style.background = headerMeta.bg;
        logoBox.style.borderColor = headerMeta.border;
        logoBox.style.boxShadow = headerMeta.glow;
    }
    if (logoRing) logoRing.style.color = headerMeta.accent;
    if (logoIsland) logoIsland.setAttribute('fill', headerMeta.accent);
    if (logoWave) logoWave.setAttribute('stroke', headerMeta.wave);
    if (logoDot) logoDot.setAttribute('fill', headerMeta.dot);
    if (badge3d) {
        badge3d.style.backgroundColor = headerMeta.badgeBg;
        badge3d.style.color = headerMeta.badgeText;
        badge3d.style.borderColor = headerMeta.badgeBorder;
    }

    const activeList = getActiveFacilitiesList();
    const fAll = document.getElementById('filter-tab-all');
    const fOff = document.getElementById('filter-tab-offshore');
    const fOn = document.getElementById('filter-tab-onshore');
    const fMar = document.getElementById('filter-tab-maritime');
    const cntAll = activeList.length;
    const cntOff = activeList.filter(f => f.category === 'offshore').length;
    const cntOn = activeList.filter(f => f.category === 'onshore').length;
    const cntMar = activeList.filter(f => f.category === 'maritime').length;
    if (fAll) fAll.textContent = `Все (${cntAll})`;
    if (fOff) fOff.textContent = `Шельф (${cntOff})`;
    if (fOn) fOn.textContent = `Берег (${cntOn})`;
    if (fMar) fMar.textContent = `Флот (${cntMar})`;

    if (typeof renderProjectLegend === 'function') {
        renderProjectLegend(activeProject, typeof isEn === 'function' && isEn());
    }

    const presetBtns = document.querySelectorAll('.preset-region-btn');
    if (presetBtns.length === 3) {
        const pLabels = {
            sakhalin2: ['Сев. шельф', 'Поясок', 'Залив Анива'],
            sakhalin1: ['Шельф S1', 'Де-Кастри', 'Чайво'],
            sakhalin3: ['Киринское', 'БТК S3', 'Ю.-Киринское'],
            shv:       ['Невельского', 'Комс. / Хаб.', 'Влад. / Русский']
        }[activeProject];
        presetBtns[0].textContent = pLabels[0];
        presetBtns[1].textContent = pLabels[1];
        presetBtns[2].textContent = pLabels[2];
    }

    currentFilter = 'all';
    currentSearchQuery = '';
    const searchInput = document.getElementById('facility-search');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.filter-tab').forEach(b => {
        const isAll = b.dataset.filter === 'all';
        b.classList.toggle('filter-active', isAll);
        b.classList.remove('bg-amber-500', 'text-slate-950');
        b.classList.toggle('shadow', isAll);
        b.classList.toggle('text-slate-300', !isAll);
    });

    renderSidebarList();
    if (typeof updateProjectHeaderAndLegendForLang === 'function') {
        updateProjectHeaderAndLegendForLang();
    }
    applyFarEastProjectVisibility();
    highlightPipelineChain(null);
    updateShipRouteHighlight();

    syncDeviceCameraLimits();
    const pose = getAdaptiveCameraPose(false);
    const wasWide = (prevProject === 'sakhalin1' || prevProject === 'shv');
    const isWide = (activeProject === 'sakhalin1' || activeProject === 'shv');
    const cloudTargetPreset = isWide ? 'sakhalin1' : 'sakhalin2';
    if (!isGlobeIntroActive && !isReturningToGlobe) {
        if (wasWide === isWide) {
            // Переход внутри одного масштаба (Сахалин-2 <-> Сахалин-3 или Сахалин-1 <-> СХВ): мягкий перелёт камеры к точке интереса
            // Обязательно через requestAnimationFrame + сброс clock.getDelta(), чтобы ленивая сборка не вызывала скачок кадра!
            const flyDuration = 1.65;
            requestAnimationFrame(() => {
                if (clock) clock.getDelta();
                setWorldCloudsAperture(cloudTargetPreset, { duration: flyDuration });
                startCameraFly(pose.pos, pose.target, {
                    duration: flyDuration,
                    arcHeight: 20,
                    smoothMode: true
                });
            });
        } else {
            // Переход между островом (Сахалин-2 / Сахалин-3) и Дальним Востоком (Сахалин-1 / СХВ): облака плавно раздвигаются/сдвигаются синхронно с камерой
            const glideDuration = 2.05;
            const glideArc = isWide ? 44 : 36;
            requestAnimationFrame(() => {
                if (clock) clock.getDelta();
                setWorldCloudsAperture(cloudTargetPreset, { duration: glideDuration });
                startCameraFly(pose.pos, pose.target, {
                    duration: glideDuration,
                    arcHeight: glideArc,
                    smoothMode: true
                });
            });
        }
    } else {
        startCameraFly(pose.pos, pose.target);
    }

    const isEnglish = (typeof isEn === 'function' && isEn());
    const toastMsg = isEnglish
        ? {
            sakhalin2: 'Switched to Sakhalin-2',
            sakhalin1: 'Switched to Sakhalin-1',
            sakhalin3: 'Switched to Sakhalin-3 (Subsea)',
            shv:       'Switched to SHV Gas Pipeline'
        }[activeProject]
        : {
            sakhalin2: 'Возврат к проекту «Сахалин-2»',
            sakhalin1: 'Открыт проект «Сахалин-1» (Шельф и Де-Кастри)',
            sakhalin3: 'Открыт проект «Сахалин-3» (Подводная добыча ПДК)',
            shv:       'Открыта магистраль МГП «Сахалин — Хабаровск — Владивосток»'
        }[activeProject];
    showToast(toastMsg);
}

function updateMarkersPosition() {
    if (!_projVec) _projVec = new THREE.Vector3();
    const width = viewportWidth;
    const height = viewportHeight;
    const isS1 = isFarEastProject();
    const camDist = (camera && controls) ? camera.position.distanceTo(controls.target) : 300;
    const s1ZoomScale = isMobileViewport() ? 1.22 : 1.0;
    const s1IsFar = isS1 && camDist > 265 * s1ZoomScale;
    const s1IsMid = isS1 && camDist > 165 * s1ZoomScale && camDist <= 265 * s1ZoomScale;
    const s1IsVeryClose = isS1 && camDist < 105 * s1ZoomScale;

    const s2ZoomScale = isMobileViewport() ? 1.25 : 1.0;
    const s2IsFar = !isS1 && camDist > 132 * s2ZoomScale;
    const s2IsMid = !isS1 && camDist > 82 * s2ZoomScale && camDist <= 132 * s2ZoomScale;

    for (let i = 0; i < cityDomList.length; i++) {
        const item = cityDomList[i];
        const sakhCityName = item.el.textContent || '';
        const hideSakhCityInS1 = isS1 && (
            s1IsFar ||
            (s1IsMid && sakhCityName !== 'Южно-Сахалинск' && sakhCityName !== 'Оха' && sakhCityName !== 'Ноглики')
        );
        const hideSakhCityInS2 = !isS1 && (
            (s2IsFar && sakhCityName !== 'Южно-Сахалинск' && sakhCityName !== 'Александровск-Сахалинский') ||
            (s2IsMid && sakhCityName !== 'Южно-Сахалинск' && sakhCityName !== 'Александровск-Сахалинский' && sakhCityName !== 'Оха' && sakhCityName !== 'Поронайск' && sakhCityName !== 'Холмск' && sakhCityName !== 'Ноглики')
        );
        if (!areLabelsVisible || hideSakhCityInS1 || hideSakhCityInS2) {
            if (item.visible) {
                item.el.style.display = 'none';
                item.visible = false;
            }
            continue;
        }
        _projVec.copy(item.worldPos).project(camera);
        if (_projVec.z > 1) {
            if (item.visible) {
                item.el.style.display = 'none';
                item.visible = false;
            }
            continue;
        }
        const sx = Math.round((_projVec.x * 0.5 + 0.5) * width);
        const sy = Math.round((-_projVec.y * 0.5 + 0.5) * height);
        if (sx < -80 || sx > width + 80 || sy < -40 || sy > height + 40) {
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
                item.el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
                item.lastX = sx;
                item.lastY = sy;
            }
        }
    }

    for (let i = 0; i < natureDomList.length; i++) {
        const nItem = natureDomList[i];
        if (!areLabelsVisible || !isNatureVisible || isS1 || s2IsFar) {
            if (nItem.visible) {
                nItem.el.style.display = 'none';
                nItem.visible = false;
            }
            continue;
        }
        _projVec.copy(nItem.worldPos).project(camera);
        if (_projVec.z > 1) {
            if (nItem.visible) {
                nItem.el.style.display = 'none';
                nItem.visible = false;
            }
            continue;
        }
        const sx = Math.round((_projVec.x * 0.5 + 0.5) * width);
        const sy = Math.round((-_projVec.y * 0.5 + 0.5) * height);
        if (sx < -100 || sx > width + 100 || sy < -50 || sy > height + 50) {
            if (nItem.visible) {
                nItem.el.style.display = 'none';
                nItem.visible = false;
            }
        } else {
            if (!nItem.visible) {
                nItem.el.style.display = 'flex';
                nItem.visible = true;
            }
            if (sx !== nItem.lastX || sy !== nItem.lastY) {
                nItem.el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
                nItem.lastX = sx;
                nItem.lastY = sy;
            }
        }
    }

    for (let i = 0; i < gridDomList.length; i++) {
        const gItem = gridDomList[i];
        if (!isGridVisible || isS1) {
            if (gItem.visible) {
                gItem.el.style.display = 'none';
                gItem.visible = false;
            }
            continue;
        }
        _projVec.copy(gItem.worldPos).project(camera);
        if (_projVec.z > 1) {
            if (gItem.visible) {
                gItem.el.style.display = 'none';
                gItem.visible = false;
            }
            continue;
        }
        const sx = Math.round((_projVec.x * 0.5 + 0.5) * width);
        const sy = Math.round((-_projVec.y * 0.5 + 0.5) * height);
        if (sx < -60 || sx > width + 60 || sy < -30 || sy > height + 30) {
            if (gItem.visible) {
                gItem.el.style.display = 'none';
                gItem.visible = false;
            }
        } else {
            if (!gItem.visible) {
                gItem.el.style.display = 'block';
                gItem.visible = true;
            }
            if (sx !== gItem.lastX || sy !== gItem.lastY) {
                gItem.el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
                gItem.lastX = sx;
                gItem.lastY = sy;
            }
        }
    }

    const nowPerf = performance.now();
    const _markerDt = Math.min(0.05, Math.max(0.008, (nowPerf - (window._lastMarkerFadeTime || nowPerf)) * 0.001));
    window._lastMarkerFadeTime = nowPerf;
    const mlMarkerAlpha = (typeof mainlandFade !== 'undefined') ? Math.pow(Math.max(0, Math.min(1, mainlandFade.alpha)), 1.4) : 1.0;

    function stepDomFade(entry, targetAlpha, displayMode) {
        if (entry.fadeAlpha === undefined) entry.fadeAlpha = entry.visible ? targetAlpha : 0;
        const speed = targetAlpha > entry.fadeAlpha ? 3.2 : 4.8;
        const diff = targetAlpha - entry.fadeAlpha;
        if (Math.abs(diff) <= 0.008) {
            entry.fadeAlpha = targetAlpha;
        } else {
            entry.fadeAlpha += diff * Math.min(1, _markerDt * speed);
        }
        if (entry.fadeAlpha <= 0.012) {
            if (entry.visible) {
                entry.el.style.display = 'none';
                entry.el.style.opacity = '0';
                entry.visible = false;
            }
            return false;
        }
        if (!entry.visible) {
            entry.el.style.display = displayMode;
            entry.visible = true;
        }
        entry.el.style.opacity = entry.fadeAlpha < 0.992 ? entry.fadeAlpha.toFixed(3) : '';
        entry.el.style.pointerEvents = entry.fadeAlpha > 0.35 ? '' : 'none';
        return true;
    }

    for (let i = 0; i < FACILITIES_DATA.length; i++) {
        const fac = FACILITIES_DATA[i];
        const entry = markerDomMap.get(fac.id);
        if (!entry || !fac.position) continue;

        const isS2Primary = fac.id === 'pa-b' || fac.id === 'obtk' || fac.id === 'nks-2' || fac.id === 'lng-plant' || fac.id === 'ton' || fac.id === 'aniva-lighthouse';
        const isS2Minor = fac.id === 'uoug-north' || fac.id === 'uoug-south';
        const showS2ByZoom = (!s2IsFar && (!s2IsMid || !isS2Minor)) || isS2Primary || fac.id === activeFacilityId || currentFilter !== 'all';
        const shouldShow = !isS1 && areLabelsVisible && showS2ByZoom && (currentFilter === 'all' || fac.category === currentFilter);
        const shipMult = (entry.shipFade !== undefined) ? entry.shipFade : 1.0;
        const targetA = shouldShow ? shipMult : 0;

        _projVec.copy(fac.position);
        _projVec.y += 2.6;
        _projVec.project(camera);

        if (_projVec.z > 1) {
            stepDomFade(entry, 0, 'flex');
            continue;
        }

        const sx = Math.round((_projVec.x * 0.5 + 0.5) * width);
        const sy = Math.round((-_projVec.y * 0.5 + 0.5) * height);
        if (sx < -120 || sx > width + 120 || sy < -60 || sy > height + 60) {
            stepDomFade(entry, 0, 'flex');
        } else {
            if (stepDomFade(entry, targetA, 'flex')) {
                if (sx !== entry.lastX || sy !== entry.lastY) {
                    entry.el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
                    entry.lastX = sx;
                    entry.lastY = sy;
                }
            }
        }
    }

    if (sakhalin1Built) {
        for (let i = 0; i < s1GridDomList.length; i++) {
            const gItem = s1GridDomList[i];
            if (!isGridVisible || !isS1) {
                if (gItem.visible) {
                    gItem.el.style.display = 'none';
                    gItem.visible = false;
                }
                continue;
            }
            _projVec.copy(gItem.worldPos).project(camera);
            if (_projVec.z > 1) {
                if (gItem.visible) {
                    gItem.el.style.display = 'none';
                    gItem.visible = false;
                }
                continue;
            }
            const sx = Math.round((_projVec.x * 0.5 + 0.5) * width);
            const sy = Math.round((-_projVec.y * 0.5 + 0.5) * height);
            if (sx < -60 || sx > width + 60 || sy < -30 || sy > height + 30) {
                if (gItem.visible) {
                    gItem.el.style.display = 'none';
                    gItem.visible = false;
                }
            } else {
                if (!gItem.visible) {
                    gItem.el.style.display = 'block';
                    gItem.visible = true;
                }
                if (sx !== gItem.lastX || sy !== gItem.lastY) {
                    gItem.el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
                    gItem.lastX = sx;
                    gItem.lastY = sy;
                }
            }
        }

        const S1_DUPLICATE_CITIES = ['Хабаровск', 'Владивосток', 'Де-Кастри', 'Комсомольск-на-Амуре'];
        const S1_MID_CITIES = ['Благовещенск', 'Охотск', 'Николаевск-на-Амуре', 'Советская Гавань', 'Уссурийск', 'Находка'];
        for (let i = 0; i < s1CityDomList.length; i++) {
            const cItem = s1CityDomList[i];
            const cls = cItem.el.className || '';
            const cName = cItem.el.textContent || '';
            let hideByZoom = false;
            if (cls.includes('region-label-3d')) {
                hideByZoom = s1IsVeryClose;
            } else if (cls.includes('transit-label-3d')) {
                hideByZoom = s1IsFar || s1IsMid;
            } else if (cls.includes('city-label-3d')) {
                if (S1_DUPLICATE_CITIES.includes(cName)) {
                    hideByZoom = true;
                } else if (s1IsFar) {
                    hideByZoom = true;
                } else if (s1IsMid && !S1_MID_CITIES.includes(cName)) {
                    hideByZoom = true;
                }
            }
            const showMainlandLabels = (activeProject === 'sakhalin1' || activeProject === 'shv');
            const targetCityA = (showMainlandLabels && areLabelsVisible && !hideByZoom) ? mlMarkerAlpha : 0;
            _projVec.copy(cItem.worldPos).project(camera);
            if (_projVec.z > 1) {
                stepDomFade(cItem, 0, 'flex');
                continue;
            }
            const sx = Math.round((_projVec.x * 0.5 + 0.5) * width);
            const sy = Math.round((-_projVec.y * 0.5 + 0.5) * height);
            if (sx < -120 || sx > width + 120 || sy < -50 || sy > height + 50) {
                stepDomFade(cItem, 0, 'flex');
            } else {
                if (stepDomFade(cItem, targetCityA, 'flex')) {
                    if (sx !== cItem.lastX || sy !== cItem.lastY) {
                        cItem.el.style.transform = cItem.isCenter
                            ? `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`
                            : `translate3d(${sx}px, ${sy}px, 0)`;
                        cItem.lastX = sx;
                        cItem.lastY = sy;
                    }
                }
            }
        }

        const activeProjIds = (typeof PROJECT_FACILITY_IDS !== 'undefined' && PROJECT_FACILITY_IDS[activeProject])
            ? PROJECT_FACILITY_IDS[activeProject]
            : null;
        for (let i = 0; i < SAKHALIN1_FACILITIES_DATA.length; i++) {
            const fac = SAKHALIN1_FACILITIES_DATA[i];
            const entry = s1MarkerDomMap.get(fac.id);
            if (!entry || !fac.position) continue;

            const inCurrentTab = !activeProjIds || activeProjIds.includes(fac.id);
            const isPrimaryHub =
                activeProject === 'sakhalin1' ||
                activeProject === 'sakhalin3' ||
                fac.id === 's3-gks' || fac.id === 's3-ks-north' || fac.id === 's3-ks-mainland' || fac.id === 's3-ks-south' ||
                fac.id === 's1-komsomolsk' || fac.id === 's1-khabarovsk' || fac.id === 's1-vladivostok' || fac.id === 's3-grs-russky';
            const showByZoom = !s1IsFar || isPrimaryHub || fac.id === activeFacilityId || currentFilter !== 'all';
            const shouldShow = isS1 && inCurrentTab && areLabelsVisible && showByZoom && (currentFilter === 'all' || fac.category === currentFilter);
            const shipMult = (entry.shipFade !== undefined) ? entry.shipFade : 1.0;
            const isMainlandFac = !ISLAND_ONLY_S1_IDS.has(fac.id);
            const targetA = shouldShow ? (shipMult * (isMainlandFac ? mlMarkerAlpha : 1.0)) : 0;

            _projVec.copy(fac.position);
            _projVec.y += 3.0;
            _projVec.project(camera);

            if (_projVec.z > 1) {
                stepDomFade(entry, 0, 'flex');
                continue;
            }

            const sx = Math.round((_projVec.x * 0.5 + 0.5) * width);
            const sy = Math.round((-_projVec.y * 0.5 + 0.5) * height);
            if (sx < -130 || sx > width + 130 || sy < -60 || sy > height + 60) {
                stepDomFade(entry, 0, 'flex');
            } else {
                if (stepDomFade(entry, targetA, 'flex')) {
                    if (sx !== entry.lastX || sy !== entry.lastY) {
                        entry.el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -100%)`;
                        entry.lastX = sx;
                        entry.lastY = sy;
                    }
                }
            }
        }
    }
}

function getFilteredFacilities() {
    const q = currentSearchQuery.trim().toLowerCase();
    const sourceList = getActiveFacilitiesList();
    return sourceList.filter(f => {
        const matchCat = currentFilter === 'all' || f.category === currentFilter;
        if (!matchCat) return false;
        if (!q) return true;
        return (
            f.name.toLowerCase().includes(q) ||
            f.shortName.toLowerCase().includes(q) ||
            f.code.toLowerCase().includes(q) ||
            f.categoryLabel.toLowerCase().includes(q)
        );
    });
}

function renderSidebarList() {
    const listEl = document.getElementById('facilities-list');
    const countBadge = document.getElementById('facilities-count-badge');
    listEl.innerHTML = '';

    const filtered = getFilteredFacilities();
    if (countBadge) countBadge.textContent = filtered.length;

    if (filtered.length === 0) {
        listEl.innerHTML = `<div class="text-center text-xs text-slate-400 py-8">Ничего не найдено</div>`;
        return;
    }

    filtered.forEach(fac => {
        const isActive = fac.id === activeFacilityId;
        const item = document.createElement('div');
        item.className = `p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 ${
            isActive
                ? 'shadow-md'
                : 'bg-slate-900/65 border-slate-800/90 hover:border-slate-600 hover:bg-slate-800/80'
        }`;
        if (isActive) {
            item.style.backgroundColor = 'var(--proj-accent-soft)';
            item.style.borderColor = 'var(--proj-accent-border)';
        }

        const dotHtml = fac.isInactiveCross
            ? `<span class="w-4 h-4 rounded bg-red-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">✕</span>`
            : `<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${fac.markerColor};"></span>`;

        item.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-0">
                ${dotHtml}
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 min-w-0">
                        <span class="text-[11px] font-extrabold whitespace-nowrap shrink-0 ${fac.isInactiveCross ? 'text-rose-400' : 'text-amber-400'}">${escapeAttr(fac.code)}</span>
                        <span class="text-[10px] text-slate-400 truncate">• ${escapeAttr(fac.categoryLabel)}</span>
                    </div>
                    <div class="text-xs font-semibold text-white truncate">${escapeAttr(fac.shortName)}</div>
                </div>
            </div>
            <a href="${escapeAttr(fac.url)}" target="_blank" rel="noopener noreferrer"
               class="sidebar-direct-link p-2 rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-300 hover:text-slate-950 transition shrink-0"
               title="Открыть сайт: ${escapeAttr(fac.shortName)}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
            </a>
        `;

        const directLink = item.querySelector('.sidebar-direct-link');
        directLink.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof openVerifiedExternalLink === 'function') {
                openVerifiedExternalLink(fac.url, fac.name || fac.shortName);
            } else {
                window.open(fac.url, '_blank', 'noopener,noreferrer');
            }
        });

        item.addEventListener('click', () => {
            selectFacility(fac.id, true);
            if (isMobileViewport()) {
                closeMobileSidebar();
            }
        });

        listEl.appendChild(item);
    });
}

