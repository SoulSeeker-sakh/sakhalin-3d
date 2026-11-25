'use strict';

// =========================================================================
// [BLOCK:UI_CAMERA]
// 9. УПРАВЛЕНИЕ МОБИЛЬНЫМИ ШТОРКАМИ, КАМЕРОЙ И ВЫБОРОМ ОБЪЕКТОВ
// =========================================================================
function setMobileBackdrop(visible) {
    const bd = document.getElementById('mobile-backdrop');
    if (!bd) return;
    if (visible && isMobileViewport()) {
        bd.classList.remove('opacity-0', 'pointer-events-none');
        bd.classList.add('opacity-100', 'pointer-events-auto');
    } else {
        bd.classList.add('opacity-0', 'pointer-events-none');
        bd.classList.remove('opacity-100', 'pointer-events-auto');
    }
}

let isMobileSidebarFullscreen = false;
let mobileDetailStage = 'normal'; // 'collapsed' | 'normal' | 'fullscreen'

function setMobileSidebarFullscreen(full) {
    isMobileSidebarFullscreen = Boolean(full);
    const en = (typeof isEn === 'function' && isEn());
    const sb = document.getElementById('sidebar-panel');
    const btn = document.getElementById('btn-toggle-sidebar-size');
    const hint = document.getElementById('mobile-sidebar-hint');
    if (sb) sb.classList.toggle('sheet-fullscreen', isMobileSidebarFullscreen);
    if (btn) btn.textContent = isMobileSidebarFullscreen ? (en ? 'Collapse' : 'Свернуть') : (en ? 'Full screen' : 'На весь экран');
    if (hint) hint.textContent = isMobileSidebarFullscreen ? (en ? 'Pull down' : 'Потяните вниз') : (en ? 'Pull up' : 'Потяните вверх');
}

function openMobileSidebar() {
    const sb = document.getElementById('sidebar-panel');
    const card = document.getElementById('detail-card');
    closeTelemetryPanel();
    if (card && isMobileViewport()) {
        card.classList.add('hidden');
        card.classList.remove('flex');
    }
    sb.classList.remove('hidden');
    sb.classList.add('flex');
    sb.classList.add('mobile-open-forced');
    setMobileSidebarFullscreen(false);
    setMobileBackdrop(true);
}

function closeMobileSidebar() {
    const sb = document.getElementById('sidebar-panel');
    if (isMobileViewport()) {
        sb.classList.add('hidden');
        sb.classList.remove('flex');
        sb.classList.remove('mobile-open-forced');
        setMobileSidebarFullscreen(false);
    }
    setMobileBackdrop(false);
}

function setMobileDetailStage(stage) {
    mobileDetailStage = stage;
    isMobileDetailCollapsed = (stage === 'collapsed');
    const en = (typeof isEn === 'function' && isEn());
    const card = document.getElementById('detail-card');
    const btn = document.getElementById('btn-toggle-detail-size');
    const hint = document.getElementById('mobile-sheet-hint');
    if (!card) return;
    card.classList.toggle('sheet-collapsed', stage === 'collapsed');
    card.classList.toggle('sheet-fullscreen', stage === 'fullscreen');
    if (btn) {
        btn.textContent = stage === 'collapsed'
            ? (en ? 'Details' : 'Подробнее')
            : (stage === 'fullscreen' ? (en ? 'Collapse' : 'Свернуть') : (en ? 'Full screen' : 'На весь экран'));
    }
    if (hint) {
        hint.textContent = stage === 'fullscreen' ? (en ? 'Pull down' : 'Потяните вниз') : (en ? 'Pull up' : 'Потяните вверх');
    }
}

function setMobileDetailCollapsed(collapsed) {
    setMobileDetailStage(collapsed ? 'collapsed' : 'normal');
}

function cycleMobileDetailSize() {
    if (mobileDetailStage === 'collapsed') setMobileDetailStage('normal');
    else if (mobileDetailStage === 'normal') setMobileDetailStage('fullscreen');
    else setMobileDetailStage('collapsed');
}

function updateShipStatusCard(ship) {
    const statusBox = document.getElementById('card-ship-status');
    if (!statusBox) return;
    if (!ship) {
        statusBox.classList.add('hidden');
        return;
    }
    statusBox.classList.remove('hidden');
    const stText = document.getElementById('ship-status-text');
    const stPhase = document.getElementById('ship-status-phase');
    if (stText) stText.textContent = ship.statusText;
    if (stPhase) stPhase.textContent = ship.phaseLabel;

    const dot = document.getElementById('ship-status-dot');
    const progWrap = document.getElementById('ship-progress-wrap');
    const progBar = document.getElementById('ship-progress-bar');

    if (ship.state === 'docked') {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0';
        progWrap.classList.remove('hidden');
        progBar.style.width = `${Math.round(ship.progress * 100)}%`;
    } else {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0';
        progWrap.classList.add('hidden');
    }
}

function startCameraFly(endPos, endTarget, options) {
    const opts = options || {};
    const dist = camera ? camera.position.distanceTo(endPos) : 0;
    const isTopDownDest = Math.abs(endPos.x - endTarget.x) < 12 && Math.abs(endPos.z - endTarget.z) < 55 && endPos.y > 180;

    cameraTransition.active = true;
    cameraTransition.progress = 0;
    cameraTransition.duration = opts.duration !== undefined
        ? opts.duration
        : (dist > 140 ? 1.38 : 1.12);
    cameraTransition.arcHeight = opts.arcHeight !== undefined
        ? opts.arcHeight
        : (isTopDownDest ? 0 : Math.min(24, dist * 0.07));
    cameraTransition.smoothMode = opts.smoothMode !== undefined ? Boolean(opts.smoothMode) : true;
    cameraTransition.startPos.copy(camera.position);
    cameraTransition.startTarget.copy(controls.target);
    cameraTransition.endPos.copy(endPos);
    cameraTransition.endTarget.copy(endTarget);
}

function updateShipRouteHighlight() {
    const isS1 = isFarEastProject();
    const chainMap = isS1 ? SAKHALIN1_CHAIN_MAP : FACILITY_CHAIN_MAP;
    const chainInfo = activeFacilityId ? chainMap[activeFacilityId] : null;
    const linkedShips = chainInfo ? chainInfo.ships : [];

    movingShips.forEach(s => {
        const isSel = !isS1 && (s.facility.id === activeFacilityId || linkedShips.includes(s.facility.id));
        const isVis = !isS1 && (currentFilter === 'all' || s.facility.category === currentFilter);
        s.routeLine.visible = isVis;
        s.routeMat.opacity = isSel ? 0.90 : (chainInfo ? 0.16 : 0.28);
    });

    if (sakhalin1Built) {
        const isS1Only = (activeProject === 'sakhalin1');
        s1MovingShips.forEach(s => {
            const isSel = isS1Only && (s.facility.id === activeFacilityId || linkedShips.includes(s.facility.id));
            const isVis = isS1Only && (currentFilter === 'all' || s.facility.category === currentFilter);
            s.routeLine.visible = isVis;
            s.routeMat.opacity = isSel ? 0.92 : (chainInfo ? 0.20 : 0.36);
        });
    }
}

function highlightPipelineChain(facilityId) {
    const isS1 = isFarEastProject();
    const chainMap = isS1 ? SAKHALIN1_CHAIN_MAP : FACILITY_CHAIN_MAP;
    const segments = isS1 ? s1PipelineSegments : pipelineSegments;
    const particles = isS1 ? s1PipelineFlowParticles : pipelineFlowParticles;
    const chainInfo = facilityId ? chainMap[facilityId] : null;
    const defaultProjTags = (isS1 && typeof PROJECT_DEFAULT_PIPES !== 'undefined') ? PROJECT_DEFAULT_PIPES[activeProject] : null;
    const activeTags = chainInfo ? chainInfo.pipes : defaultProjTags;

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        if (!activeTags) {
            seg.mat.opacity = 1.0;
            seg.mat.emissiveIntensity = isS1 ? 0.18 : 0.08;
        } else if (activeTags.includes(seg.chainTag)) {
            seg.mat.opacity = 1.0;
            seg.mat.emissiveIntensity = chainInfo ? 0.72 : 0.24;
        } else {
            seg.mat.opacity = chainInfo ? 0.22 : 0.18;
            seg.mat.emissiveIntensity = 0.0;
        }
    }

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!activeTags) {
            p.mesh.scale.setScalar(1.0);
        } else if (activeTags.includes(p.chainTag)) {
            p.mesh.scale.setScalar(chainInfo ? 1.38 : 1.05);
        } else {
            p.mesh.scale.setScalar(chainInfo ? 0.6 : 0.42);
        }
    }
}

function getFacilityOperatorInfo(facId) {
    if (!facId || !window.PARTNER_LOGOS) return null;
    const s2Ids = new Set([
        'pa-b', 'pa-a', 'uoug-north', 'lun-a', 'obtk', 'nks-2',
        'uoug-south', 'lng-plant', 'tanker-aniva', 'lng-carrier', 'supply-vessel'
    ]);
    if (s2Ids.has(facId)) {
        return {
            logo: window.PARTNER_LOGOS.sakhalinEnergy,
            nameRu: 'ООО «Сахалинская Энергия»',
            nameEn: 'Sakhalin Energy LLC',
            tall: true
        };
    }
    if (facId.startsWith('s3-') || facId === 's1-komsomolsk' || facId === 's1-khabarovsk' || facId === 's1-vladivostok') {
        return {
            logo: window.PARTNER_LOGOS.gazprom,
            nameRu: 'ПАО «Газпром»',
            nameEn: 'PJSC Gazprom',
            tall: false
        };
    }
    const s1RosneftIds = new Set([
        's1-odoptu', 's1-berkut', 's1-orlan', 's1-chayvo', 's1-dekastri', 's1-tanker-dekastri'
    ]);
    if (s1RosneftIds.has(facId) && window.PARTNER_LOGOS.rosneft) {
        return {
            logo: window.PARTNER_LOGOS.rosneft,
            nameRu: 'ПАО «НК «Роснефть» (ООО «Сахалин-1»)',
            nameEn: 'Rosneft (Sakhalin-1 LLC)',
            tall: false
        };
    }
    return null;
}

function renderFacilityCardContent(fac, subTabIndex = 0) {
    const hasSubTabs = Array.isArray(fac.subTabs) && fac.subTabs.length > 0;
    const safeIdx = hasSubTabs ? Math.max(0, Math.min(subTabIndex, fac.subTabs.length - 1)) : 0;
    const activeTab = hasSubTabs ? fac.subTabs[safeIdx] : null;

    const badgeText = activeTab ? activeTab.badge : fac.categoryLabel;
    const codeText = activeTab ? activeTab.code : fac.code;
    const titleText = activeTab ? activeTab.name : fac.name;
    const descText = activeTab ? activeTab.description : fac.description;
    const locText = activeTab ? activeTab.location : fac.location;
    const specsList = activeTab ? activeTab.specs : fac.specs;

    const setElText = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val; };
    setElText('card-badge', badgeText);
    setElText('card-code', codeText);
    setElText('card-title', titleText);
    setElText('card-desc', descText);
    setElText('card-location', locText);

    const opRow = document.getElementById('card-operator-row');
    const opLogo = document.getElementById('card-operator-logo');
    const opName = document.getElementById('card-operator-name');
    if (opRow && opLogo && opName) {
        const opInfo = getFacilityOperatorInfo(fac.id);
        if (opInfo && opInfo.logo) {
            opLogo.src = opInfo.logo;
            const isEn = (typeof currentLang !== 'undefined' && currentLang === 'en');
            opLogo.alt = isEn ? opInfo.nameEn : opInfo.nameRu;
            opLogo.className = opInfo.tall
                ? 'h-6 w-6 object-contain shrink-0'
                : 'h-5 w-auto object-contain shrink-0';
            opName.textContent = isEn ? opInfo.nameEn : opInfo.nameRu;
            opRow.classList.remove('hidden');
        } else {
            opRow.classList.add('hidden');
            opLogo.removeAttribute('src');
            opName.textContent = '';
        }
    }

    const specsGrid = document.getElementById('card-specs');
    specsGrid.innerHTML = specsList.map(s => `
        <div class="bg-slate-950/70 border border-slate-800/90 rounded-xl px-3 py-2">
            <div class="text-[10px] text-slate-400">${escapeAttr(s.label)}</div>
            <div class="text-xs font-bold text-white mt-0.5">${escapeAttr(s.value)}</div>
        </div>
    `).join('');

    const subWrap = document.getElementById('card-subtabs-wrap');
    const subBox = document.getElementById('card-subtabs');
    if (subWrap && subBox) {
        if (!hasSubTabs) {
            subWrap.classList.add('hidden');
            subBox.innerHTML = '';
        } else {
            subWrap.classList.remove('hidden');
            subBox.innerHTML = fac.subTabs.map((tab, idx) => {
                const isActiveTab = idx === safeIdx;
                const activeCls = isActiveTab
                    ? 'bg-slate-800 text-white border-amber-400/70 shadow'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200';
                return `
                    <button type="button" data-subtab="${idx}" class="card-subtab-btn py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${activeCls}">
                        <span class="w-2 h-2 rounded-full shrink-0" style="background-color:${tab.dotColor};"></span>
                        <span class="truncate">${escapeAttr(tab.tabLabel)}</span>
                    </button>
                `;
            }).join('');
            subBox.querySelectorAll('.card-subtab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    renderFacilityCardContent(fac, Number(btn.dataset.subtab));
                });
            });
        }
    }
}

function selectFacility(id, flyTo = true) {
    const isS1 = isFarEastProject();
    const list = getActiveFacilitiesList();
    const fac = list.find(f => f.id === id);
    if (!fac || !fac.position) return;

    activeFacilityId = id;

    const activeMarkers = isS1 ? s1MarkerDomMap : markerDomMap;
    const activeModels = isS1 ? s1FacilityModelsMap : facilityModelsMap;

    activeMarkers.forEach((entry, key) => {
        entry.el.classList.toggle('active', key === id);
    });

    activeModels.forEach((entry, key) => {
        const baseScale = key === 's1-chayvo' ? 1.65 : 1.0;
        entry.selectionRing.material.opacity = key === id ? 0.95 : 0.45;
        entry.selectionRing.scale.setScalar(key === id ? baseScale * 1.2 : baseScale);
    });

    highlightPipelineChain(id);
    updateShipRouteHighlight();
    renderSidebarList();

    renderFacilityCardContent(fac, 0);

    const websiteBtn = document.getElementById('card-website-btn');
    if (websiteBtn) websiteBtn.href = fac.url;
    const domainHintEl = document.getElementById('card-domain-hint');
    if (domainHintEl) {
        try {
            const domain = new URL(fac.url).hostname.replace(/^www\./, '');
            domainHintEl.textContent = domain;
        } catch (_) {
            domainHintEl.textContent = fac.url;
        }
    }

    const shipObj = getActiveMovingShips().find(s => s.facility.id === id) || null;
    updateShipStatusCard(shipObj);

    const urlEditorBox = document.getElementById('url-editor-box');
    if (urlEditorBox) urlEditorBox.classList.add('hidden');
    const customUrlInput = document.getElementById('custom-url-input');
    if (customUrlInput) customUrlInput.value = fac.url;

    const card = document.getElementById('detail-card');
    card.classList.remove('hidden');
    card.classList.add('flex');

    if (isMobileViewport()) {
        closeTelemetryPanel();
        setMobileDetailCollapsed(true);
        setMobileBackdrop(false);
    }

    // Если выбран полностью подводный объект (например, ПДК «Сахалин-3»), автоматически включаем подводный вид X-Ray,
    // чтобы пользователь сразу видел жёлто-оранжевые комплексы и трубы на морском дне!
    if (fac.isSubseaOnly && !isSubseaMode && typeof toggleSubseaMode === 'function') {
        toggleSubseaMode(true);
    }

    if (flyTo) {
        const baseDistMult = (isMobileViewport() ? 1.18 : 1.0) * (isS1 && !fac.isMovingShip ? 1.55 : 1.0);
        const distMult = fac.isSubseaOnly ? (baseDistMult * 0.72) : baseDistMult;
        const targetPos = new THREE.Vector3(
            fac.position.x + 10.5 * distMult,
            fac.position.y + (fac.isSubseaOnly ? 9.5 : 8.5) * distMult,
            fac.position.z + 10.5 * distMult
        );
        startCameraFly(targetPos, fac.position);
    }
}

function closeDetailCard() {
    const card = document.getElementById('detail-card');
    card.classList.add('hidden');
    card.classList.remove('flex');
    activeFacilityId = null;
    markerDomMap.forEach(entry => entry.el.classList.remove('active'));
    facilityModelsMap.forEach(entry => {
        entry.selectionRing.material.opacity = 0.4;
        entry.selectionRing.scale.setScalar(1.0);
    });
    if (sakhalin1Built) {
        s1MarkerDomMap.forEach(entry => entry.el.classList.remove('active'));
        s1FacilityModelsMap.forEach((entry, key) => {
            entry.selectionRing.material.opacity = 0.45;
            entry.selectionRing.scale.setScalar(key === 's1-chayvo' ? 1.65 : 1.0);
        });
    }
    highlightPipelineChain(null);
    updateShipRouteHighlight();
    renderSidebarList();
}

function cycleFacility(step) {
    const list = getFilteredFacilities();
    if (list.length === 0) return;
    const idx = list.findIndex(f => f.id === activeFacilityId);
    const nextIdx = idx < 0 ? 0 : (idx + step + list.length) % list.length;
    selectFacility(list[nextIdx].id, true);
}

function getAdaptiveCameraPose(isTopDown) {
    const isPortrait = viewportHeight > viewportWidth;
    if (activeProject === 'sakhalin1') {
        if (isTopDown) {
            return {
                pos: new THREE.Vector3(-12, isPortrait ? 195 : 155, -36),
                target: new THREE.Vector3(-12, 0, -40)
            };
        }
        return {
            pos: isPortrait ? new THREE.Vector3(38, 92, 34) : new THREE.Vector3(28, 72, 22),
            target: new THREE.Vector3(-12, 0, -40)
        };
    }
    if (activeProject === 'sakhalin3') {
        if (isTopDown) {
            return {
                pos: new THREE.Vector3(11.5, isPortrait ? 115 : 85, -18),
                target: new THREE.Vector3(11.5, 0, -20.5)
            };
        }
        return {
            pos: isPortrait ? new THREE.Vector3(46, 44, 14) : new THREE.Vector3(40, 34, 6),
            target: new THREE.Vector3(11.5, 0, -20.5)
        };
    }
    if (activeProject === 'shv') {
        if (isTopDown) {
            return {
                pos: new THREE.Vector3(-112, isPortrait ? 680 : 540, 22),
                target: new THREE.Vector3(-112, 0, 5)
            };
        }
        return {
            pos: isPortrait ? new THREE.Vector3(95, 325, 360) : new THREE.Vector3(75, 255, 295),
            target: new THREE.Vector3(-105, 0, 8)
        };
    }
    if (isTopDown) {
        return {
            pos: new THREE.Vector3(2, isPortrait ? 330 : 275, 14),
            target: new THREE.Vector3(2, 0, 5)
        };
    }
    return {
        pos: isPortrait ? new THREE.Vector3(82, 126, 132) : new THREE.Vector3(70, 96, 102),
        target: new THREE.Vector3(2, 0, 6)
    };
}

function resetCameraView() {
    if (tourState.active) stopAutoTour(false);
    closeDetailCard();
    closeMobileSidebar();
    const pose = getAdaptiveCameraPose(false);
    startCameraFly(pose.pos, pose.target);
}

function flyToTopView() {
    if (tourState.active) stopAutoTour(false);
    closeDetailCard();
    closeMobileSidebar();
    const pose = getAdaptiveCameraPose(true);
    startCameraFly(pose.pos, pose.target);
}

function orientCameraNorth() {
    const dx = camera.position.x - controls.target.x;
    const dy = camera.position.y - controls.target.y;
    const dz = camera.position.z - controls.target.z;
    const horizDist = Math.max(4, Math.hypot(dx, dz));
    const northPos = new THREE.Vector3(
        controls.target.x,
        controls.target.y + dy,
        controls.target.z + horizDist
    );
    startCameraFly(northPos, controls.target.clone());
    showToast('Карта ориентирована на Север');
}

function flyToRegionPreset(presetKey) {
    const presetSource =
        activeProject === 'sakhalin1' ? SAKHALIN1_PRESETS :
        activeProject === 'sakhalin3' ? SAKHALIN3_PRESETS :
        activeProject === 'shv' ? SHV_PRESETS :
        REGION_PRESETS;
    const preset = presetSource[presetKey];
    if (!preset) return;
    if (tourState.active) stopAutoTour(false);
    closeDetailCard();
    if (isMobileViewport()) closeTelemetryPanel();

    const target = lonLatToVec3(preset.targetLonLat[0], preset.targetLonLat[1], 0.5);
    const mult = isMobileViewport() ? 1.22 : 1.0;
    const endPos = new THREE.Vector3(
        target.x + preset.offset[0] * mult,
        target.y + preset.offset[1] * mult,
        target.z + preset.offset[2] * mult
    );
    startCameraFly(endPos, target);
    showToast('Район: ' + preset.label);
}

function toggleTelemetryPanel() {
    const panel = document.getElementById('telemetry-panel');
    if (!panel) return;
    const willOpen = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !willOpen);
    const btn = document.getElementById('btn-open-telemetry');
    if (btn) {
        btn.classList.toggle('border-amber-400', willOpen);
        btn.classList.toggle('bg-amber-500/20', willOpen);
    }
}

function closeTelemetryPanel() {
    const panel = document.getElementById('telemetry-panel');
    const btn = document.getElementById('btn-open-telemetry');
    if (panel) panel.classList.add('hidden');
    if (btn) {
        btn.classList.remove('border-amber-400', 'bg-amber-500/20');
    }
}

function toggleSubseaMode(forceState) {
    isSubseaMode = (typeof forceState === 'boolean') ? forceState : !isSubseaMode;
    if (waterMesh && waterMesh.material) {
        waterMesh.material.transparent = isSubseaMode;
        waterMesh.material.depthWrite = !isSubseaMode;
        waterMesh.material.needsUpdate = true;
    }
    if (waterUniforms) {
        waterUniforms.uSubseaMix.value = isSubseaMode ? 1.0 : 0.0;
    }
    if (subseaGroup) {
        subseaGroup.visible = isSubseaMode;
    }
    if (s1SubseaGroup) {
        s1SubseaGroup.visible = isSubseaMode;
    }

    const quickBtn = document.getElementById('btn-quick-subsea');
    const panelBtn = document.getElementById('btn-panel-subsea');

    if (quickBtn) {
        quickBtn.classList.toggle('text-cyan-300', isSubseaMode);
        quickBtn.classList.toggle('border-cyan-400/80', isSubseaMode);
        quickBtn.classList.toggle('bg-cyan-500/20', isSubseaMode);
        quickBtn.classList.toggle('text-slate-300', !isSubseaMode);
    }
    if (panelBtn) {
        panelBtn.classList.toggle('border-cyan-400/80', isSubseaMode);
        panelBtn.classList.toggle('bg-cyan-500/20', isSubseaMode);
        panelBtn.classList.toggle('text-white', isSubseaMode);
        panelBtn.classList.toggle('text-slate-300', !isSubseaMode);
    }
    showToast(isSubseaMode ? 'Подводный вид шельфа: основания ОГТ и скважины' : 'Обычный режим поверхности океана');
}

function toggleNauticalGrid() {
    isGridVisible = !isGridVisible;
    if (nauticalGridGroup) nauticalGridGroup.visible = isGridVisible && activeProject === 'sakhalin2';
    if (s1NauticalGridGroup) s1NauticalGridGroup.visible = isGridVisible && isFarEastProject();
    const panelBtn = document.getElementById('btn-panel-grid');
    if (panelBtn) {
        panelBtn.classList.toggle('border-sky-400/80', isGridVisible);
        panelBtn.classList.toggle('bg-sky-500/20', isGridVisible);
        panelBtn.classList.toggle('text-white', isGridVisible);
        panelBtn.classList.toggle('text-slate-300', !isGridVisible);
    }
    showToast(isGridVisible ? 'Навигационная сетка (°N / °E) включена' : 'Навигационная сетка скрыта');
}

function toggleNatureLayer() {
    isNatureVisible = !isNatureVisible;
    if (natureLandmarksGroup) natureLandmarksGroup.visible = isNatureVisible;
    const panelBtn = document.getElementById('btn-panel-nature');
    if (panelBtn) {
        panelBtn.classList.toggle('border-emerald-400/80', isNatureVisible);
        panelBtn.classList.toggle('bg-emerald-500/20', isNatureVisible);
        panelBtn.classList.toggle('text-white', isNatureVisible);
        panelBtn.classList.toggle('text-slate-300', !isNatureVisible);
        panelBtn.classList.toggle('bg-slate-900/85', !isNatureVisible);
        panelBtn.classList.toggle('border-slate-700/80', !isNatureVisible);
    }
    showToast(isNatureVisible ? 'Слой «Природа Сахалина» включён' : 'Слой «Природа Сахалина» скрыт');
}

function flyToNatureLandmark(id) {
    const nl = NATURE_LANDMARKS_DATA.find(item => item.id === id);
    if (!nl) return;
    if (tourState.active) stopAutoTour(false);
    closeDetailCard();
    if (isMobileViewport()) closeTelemetryPanel();

    const [tx, tz] = lonLatToXZ(nl.geoLonLat[0], nl.geoLonLat[1]);
    const ty = Math.max(0.15, getSakhalinElevation(tx, tz)) + 0.35;
    const target = new THREE.Vector3(tx, ty, tz);
    const mult = isMobileViewport() ? 1.2 : 1.0;
    const endPos = new THREE.Vector3(
        tx + nl.camOffset[0] * mult,
        ty + nl.camOffset[1] * mult,
        tz + nl.camOffset[2] * mult
    );
    startCameraFly(endPos, target);
    showToast(nl.toast);
}

function updateProductionTelemetry(percentVal) {
    const pct = Math.max(50, Math.min(150, Number(percentVal) || 100));
    productionRate = pct / 100;

    const rateBadge = document.getElementById('telemetry-rate-badge');
    const kpiLng = document.getElementById('kpi-lng');
    const kpiOil = document.getElementById('kpi-oil');
    const kpiGas = document.getElementById('kpi-gas');

    if (rateBadge) rateBadge.textContent = `${pct}%`;
    if (kpiLng) kpiLng.textContent = `${(11.5 * productionRate).toFixed(1)} млн т/г`;
    if (kpiOil) kpiOil.textContent = `${(29.0 * productionRate).toFixed(1)} тыс. т/сут`;
    if (kpiGas) kpiGas.textContent = `${(51.0 * productionRate).toFixed(1)} млн м³/с`;
}

function playShipHornSound() {
    if (typeof playMarineVesselSfx === 'function') {
        playMarineVesselSfx();
    }
}

function syncAllSoundButtons() {
    const on = Boolean(isSoundEnabled);
    const offIcon = document.getElementById('sound-icon-off');
    const onIcon = document.getElementById('sound-icon-on');
    const quickBtn = document.getElementById('btn-quick-sound');
    const panelBtn = document.getElementById('btn-panel-sound');
    const globeOn = document.getElementById('globe-sound-on');
    const globeOff = document.getElementById('globe-sound-off');

    if (offIcon) offIcon.classList.toggle('hidden', on);
    if (onIcon) onIcon.classList.toggle('hidden', !on);
    if (globeOn) globeOn.classList.toggle('hidden', !on);
    if (globeOff) globeOff.classList.toggle('hidden', on);

    if (quickBtn) {
        quickBtn.classList.toggle('border-emerald-400/80', on);
        quickBtn.classList.toggle('bg-emerald-500/20', on);
    }
    if (panelBtn) {
        panelBtn.classList.toggle('border-emerald-400/80', on);
        panelBtn.classList.toggle('bg-emerald-500/20', on);
        panelBtn.classList.toggle('text-white', on);
        panelBtn.classList.toggle('text-slate-300', !on);
    }
}

async function toggleSoundMode(forceState) {
    // Если браузер ещё держал аудио на паузе до первого клика, первый клик по кнопке звука разблокирует его, а не выключит тишину
    const wasLockedByBrowser = (
        typeof forceState !== 'boolean' &&
        isSoundEnabled &&
        typeof soundV25 !== 'undefined' &&
        (!soundV25.ctx || soundV25.ctx.state === 'suspended')
    );

    const nextState = wasLockedByBrowser
        ? true
        : ((typeof forceState === 'boolean') ? forceState : !isSoundEnabled);

    isSoundEnabled = nextState;
    if (typeof soundV25 !== 'undefined') {
        soundV25.enabled = nextState;
    }
    syncAllSoundButtons();

    if (isSoundEnabled && typeof ensureSoundV25Graph === 'function') {
        ensureSoundV25Graph();
        if (soundV25.ctx && soundV25.ctx.state === 'suspended') {
            try { await soundV25.ctx.resume(); } catch (_) {}
        }
    }
    if (typeof updateSoundDesignV25 === 'function') {
        updateSoundDesignV25(0.016, clock ? clock.getElapsedTime() : 0);
    }
    if (typeof showToast === 'function') {
        showToast(isSoundEnabled ? 'Атмосферный звук включён' : 'Звук отключён');
    }
}

function updateTourUiState() {
    const banner = document.getElementById('tour-banner');
    const dPlay = document.getElementById('desktop-tour-icon-play');
    const dStop = document.getElementById('desktop-tour-icon-stop');
    const dText = document.getElementById('desktop-tour-text');
    const mPlay = document.getElementById('mobile-tour-icon-play');
    const mStop = document.getElementById('mobile-tour-icon-stop');
    const mText = document.getElementById('mobile-tour-text');
    const mBtn = document.getElementById('btn-mobile-tour');

    if (banner) banner.classList.toggle('hidden', !tourState.active);
    if (dPlay) dPlay.classList.toggle('hidden', tourState.active);
    if (dStop) dStop.classList.toggle('hidden', !tourState.active);
    if (dText) dText.textContent = tourState.active ? 'Стоп тур' : 'Автотур';
    if (mPlay) mPlay.classList.toggle('hidden', tourState.active);
    if (mStop) mStop.classList.toggle('hidden', !tourState.active);
    if (mText) mText.textContent = tourState.active ? 'Стоп' : 'Тур';
    if (mBtn) {
        mBtn.classList.toggle('bg-rose-500/20', tourState.active);
        mBtn.classList.toggle('border', tourState.active);
        mBtn.classList.toggle('border-rose-400/50', tourState.active);
    }
}

function goToTourStep(idx) {
    const stops = getActiveTourStops();
    tourState.index = (idx + stops.length) % stops.length;
    tourState.timer = 0;
    const targetId = stops[tourState.index];
    const fac = getActiveFacilitiesList().find(f => f.id === targetId);
    selectFacility(targetId, true);

    const labelEl = document.getElementById('tour-step-label');
    if (labelEl && fac) {
        labelEl.textContent = `Автотур ${tourState.index + 1}/${stops.length} • ${fac.code}`;
    }
    const barEl = document.getElementById('tour-progress-bar');
    if (barEl) barEl.style.width = '0%';
}

function startAutoTour() {
    closeMobileSidebar();
    if (currentFilter !== 'all') {
        currentFilter = 'all';
        document.querySelectorAll('.filter-tab').forEach(b => {
            const isAll = b.dataset.filter === 'all';
            b.classList.toggle('bg-amber-500', isAll);
            b.classList.toggle('text-slate-950', isAll);
            b.classList.toggle('shadow', isAll);
            b.classList.toggle('text-slate-300', !isAll);
        });
    }
    tourState.active = true;
    updateTourUiState();
    goToTourStep(0);
    showToast('Автотур запущен — коснитесь карты для паузы');
}

function stopAutoTour(notify = true) {
    if (!tourState.active) return;
    tourState.active = false;
    updateTourUiState();
    if (notify) showToast('Автотур завершён');
}

function toggleAutoTour() {
    if (tourState.active) stopAutoTour(true);
    else startAutoTour();
}

function toggleFlowState() {
    isFlowEnabled = !isFlowEnabled;
    const dDot = document.getElementById('flow-dot');
    const dLabel = document.getElementById('desktop-flow-text');
    const mDot = document.getElementById('mobile-flow-dot');
    const mLabel = document.getElementById('mobile-flow-text');

    if (isFlowEnabled) {
        if (dDot) { dDot.classList.remove('bg-slate-500'); dDot.classList.add('bg-emerald-400', 'animate-pulse'); }
        if (mDot) { mDot.classList.remove('bg-slate-500'); mDot.classList.add('bg-emerald-400', 'animate-pulse'); }
        if (dLabel) dLabel.textContent = 'Поток сырья: ВКЛ';
        if (mLabel) mLabel.textContent = 'Поток';
    } else {
        if (dDot) { dDot.classList.remove('bg-emerald-400', 'animate-pulse'); dDot.classList.add('bg-slate-500'); }
        if (mDot) { mDot.classList.remove('bg-emerald-400', 'animate-pulse'); mDot.classList.add('bg-slate-500'); }
        if (dLabel) dLabel.textContent = 'Поток сырья: ВЫКЛ';
        if (mLabel) mLabel.textContent = 'Пауза';
    }

    pipelineFlowParticles.forEach(p => {
        p.mesh.visible = isFlowEnabled;
    });
    if (sakhalin1Built) {
        const projPipes = (typeof PROJECT_DEFAULT_PIPES !== 'undefined' && PROJECT_DEFAULT_PIPES[activeProject]) || null;
        s1PipelineFlowParticles.forEach(p => {
            p.mesh.visible = isFlowEnabled && (!projPipes || projPipes.includes(p.chainTag));
        });
    }
    const en = (typeof isEn === 'function' && isEn());
    showToast(isFlowEnabled
        ? (en ? 'Pipeline flow animation enabled' : 'Поток сырья по трассе включён')
        : (en ? 'Pipeline flow animation paused' : 'Поток сырья приостановлен'));
    if (typeof syncSettingsModalUI === 'function') syncSettingsModalUI();
}

function toggleLabelsState() {
    areLabelsVisible = !areLabelsVisible;
    const en = (typeof isEn === 'function' && isEn());
    const dText = document.getElementById('desktop-labels-text');
    const mBtn = document.getElementById('btn-mobile-labels');
    if (dText) dText.textContent = areLabelsVisible ? (en ? 'Labels: ON' : 'Метки: ВКЛ') : (en ? 'Labels: OFF' : 'Метки: ВЫКЛ');
    if (mBtn) {
        mBtn.classList.toggle('text-amber-400', areLabelsVisible);
        mBtn.classList.toggle('text-slate-400', !areLabelsVisible);
    }
    showToast(areLabelsVisible ? (en ? 'Map labels shown' : 'Подписи и метки показаны') : (en ? 'Map labels hidden' : 'Подписи и метки скрыты'));
    if (typeof syncSettingsModalUI === 'function') syncSettingsModalUI();
}

let weatherModeIndex = 0; // 0: Лето днём, 1: Снег днём, 2: Снег ночью

function setWeatherMode(modeIdx, silent = false) {
    weatherModeIndex = ((modeIdx % 3) + 3) % 3;
    const en = (typeof isEn === 'function' && isEn());
    const nextWinter = (weatherModeIndex === 1 || weatherModeIndex === 2);
    const nextNight = (weatherModeIndex === 2);

    isWinterMode = nextWinter;
    isNightMode = nextNight;

    const dText = document.getElementById('desktop-weather-text');
    const dBtn = document.getElementById('btn-toggle-weather');
    const mBtn = document.getElementById('btn-mobile-weather');

    const icons = [
        { d: 'desktop-weather-icon-summer',     m: 'mobile-weather-icon-summer' },
        { d: 'desktop-weather-icon-snow-day',   m: 'mobile-weather-icon-snow-day' },
        { d: 'desktop-weather-icon-snow-night', m: 'mobile-weather-icon-snow-night' }
    ];
    for (let i = 0; i < icons.length; i++) {
        const dEl = document.getElementById(icons[i].d);
        const mEl = document.getElementById(icons[i].m);
        if (dEl) dEl.classList.toggle('hidden', i !== weatherModeIndex);
        if (mEl) mEl.classList.toggle('hidden', i !== weatherModeIndex);
    }

    const labels = en
        ? ['Summer • Day', 'Snow • Day', 'Snow • Night']
        : ['Лето • День', 'Снег • День', 'Снег • Ночь'];
    const toasts = en
        ? ['Weather: Summer, day', 'Weather: Snow, day', 'Weather: Snow, night']
        : ['Погода: Лето, день', 'Погода: Снег, день (льды и метель)', 'Погода: Снег, ночь (огни городов и маяков)'];
    if (dText) dText.textContent = labels[weatherModeIndex];

    if (dBtn) {
        dBtn.classList.toggle('border-sky-300/70', weatherModeIndex === 1);
        dBtn.classList.toggle('border-indigo-400/70', weatherModeIndex === 2);
    }
    if (mBtn) {
        mBtn.classList.toggle('border-sky-300/70', weatherModeIndex === 1);
        mBtn.classList.toggle('bg-sky-500/20', weatherModeIndex === 1);
        mBtn.classList.toggle('border-indigo-400/70', weatherModeIndex === 2);
        mBtn.classList.toggle('bg-indigo-500/20', weatherModeIndex === 2);
    }

    if (!silent) showToast(toasts[weatherModeIndex]);
    if (typeof syncSettingsModalUI === 'function') syncSettingsModalUI();
}

function cycleWeatherMode() {
    setWeatherMode((weatherModeIndex + 1) % 3, false);
}

function toggleThemeMode() {
    cycleWeatherMode();
}

function showToast(msg) {
    const toast = document.getElementById('toast-box');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.add('hidden');
    }, 2400);
}

// =========================================================================
// УМНАЯ ПРОВЕРКА ССЫЛОК + БАННЕР-ЗАГЛУШКА, СНИМОК КАРТЫ И ОКНО «О ПРОЕКТЕ»
// =========================================================================
function resolveFallbackWikiUrl(url, queryName, en) {
    const raw = (String(url || '') + ' ' + String(queryName || '')).toLowerCase();
    if (/wikipedia\.org/i.test(url || '')) return url;

    if (/sakhalin3|shelf-dobycha|сахалин-3|сахалин 3|киринск|kirinsk/.test(raw)) {
        return en
            ? 'https://en.wikipedia.org/wiki/Sakhalin-III'
            : 'https://ru.wikipedia.org/wiki/%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD-3';
    }
    if (/\/shv\b|tomsk-tr|мгп|схв|хабаровск|владивосток|khabarovsk|vladivostok|shv/.test(raw)) {
        return en
            ? 'https://en.wikipedia.org/wiki/Sakhalin%E2%80%93Khabarovsk%E2%80%93Vladivostok_pipeline'
            : 'https://ru.wikipedia.org/wiki/%D0%93%D0%B0%D0%B7%D0%BE%D0%BF%D1%80%D0%BE%D0%B2%D0%BE%D0%B4_%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD_%E2%80%94_%D0%A5%D0%B0%D0%B1%D0%B0%D1%80%D0%BE%D0%B2%D1%81%D0%BA_%E2%80%94_%D0%92%D0%BB%D0%B0%D0%B4%D0%B8%D0%B2%D0%BE%D1%81%D1%82%D0%BE%D0%BA';
    }
    if (/rosneft|sakhalin_1|сахалин-1|сахалин 1|чайво|одопту|орлан|беркут|де-кастри|chayvo|odoptu|orlan|berkut|de-kastri/.test(raw)) {
        return en
            ? 'https://en.wikipedia.org/wiki/Sakhalin-I'
            : 'https://ru.wikipedia.org/wiki/%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD-1';
    }

    const proj = (typeof activeProject !== 'undefined') ? activeProject : 'sakhalin2';
    if (proj === 'sakhalin3') {
        return en
            ? 'https://en.wikipedia.org/wiki/Sakhalin-III'
            : 'https://ru.wikipedia.org/wiki/%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD-3';
    }
    if (proj === 'shv') {
        return en
            ? 'https://en.wikipedia.org/wiki/Sakhalin%E2%80%93Khabarovsk%E2%80%93Vladivostok_pipeline'
            : 'https://ru.wikipedia.org/wiki/%D0%93%D0%B0%D0%B7%D0%BE%D0%BF%D1%80%D0%BE%D0%B2%D0%BE%D0%B4_%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD_%E2%80%94_%D0%A5%D0%B0%D0%B1%D0%B0%D1%80%D0%BE%D0%B2%D1%81%D0%BA_%E2%80%94_%D0%92%D0%BB%D0%B0%D0%B4%D0%B8%D0%B2%D0%BE%D1%81%D1%82%D0%BE%D0%BA';
    }
    if (proj === 'sakhalin1') {
        return en
            ? 'https://en.wikipedia.org/wiki/Sakhalin-I'
            : 'https://ru.wikipedia.org/wiki/%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD-1';
    }
    return en
        ? 'https://en.wikipedia.org/wiki/Sakhalin-II'
        : 'https://ru.wikipedia.org/wiki/%D0%A1%D0%B0%D1%85%D0%B0%D0%BB%D0%B8%D0%BD-2';
}

function showLinkFallbackModal(url, queryName) {
    const modal = document.getElementById('link-fallback-modal');
    if (!modal) return;
    const en = (typeof isEn === 'function' && isEn());
    const safeUrl = (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) ? url.trim() : '';
    const urlEl = document.getElementById('link-fb-url');
    const wikiBtn = document.getElementById('link-fb-wiki');
    const searchBtn = document.getElementById('link-fb-search');
    const openBtn = document.getElementById('link-fb-open');

    if (urlEl) urlEl.textContent = safeUrl;
    if (wikiBtn) wikiBtn.href = resolveFallbackWikiUrl(safeUrl, queryName, en);
    if (openBtn) openBtn.href = safeUrl || '#';
    if (searchBtn) {
        const q = encodeURIComponent(queryName || safeUrl || 'Sakhalin oil and gas');
        searchBtn.href = en
            ? `https://www.google.com/search?q=${q}`
            : `https://yandex.ru/search/?text=${q}`;
    }
    modal.classList.remove('hidden');
}

function closeLinkFallbackModal() {
    const modal = document.getElementById('link-fallback-modal');
    if (modal) modal.classList.add('hidden');
}

async function openVerifiedExternalLink(url, queryName) {
    if (!url || url === '#' || !/^https?:\/\//i.test(String(url).trim())) return;
    const safeUrl = String(url).trim();
    const en = (typeof isEn === 'function' && isEn());

    // 1. Быстрая проверка: есть ли вообще сеть
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        showLinkFallbackModal(safeUrl, queryName);
        return;
    }

    // 2. Быстрый тест доступности хоста (no-cors, таймаут 2.4 сек)
    showToast(en ? 'Checking link availability...' : 'Проверяем доступность ссылки...');
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 2400) : null;
    try {
        await fetch(safeUrl, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store',
            signal: ctrl ? ctrl.signal : undefined
        });
        if (timer) clearTimeout(timer);
        const w = window.open(safeUrl, '_blank', 'noopener,noreferrer');
        if (!w) showLinkFallbackModal(safeUrl, queryName);
    } catch (_) {
        if (timer) clearTimeout(timer);
        showLinkFallbackModal(safeUrl, queryName);
    }
}

function captureMapScreenshot() {
    if (!renderer || !scene || !camera) return;
    const en = (typeof isEn === 'function' && isEn());
    try {
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `Sakhalin_3D_${activeProject || 'map'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(en ? '3D map snapshot saved (PNG)' : 'Снимок 3D-карты сохранён (PNG)');
    } catch (_) {
        showToast(en ? 'Could not save snapshot' : 'Не удалось сохранить снимок');
    }
}

const PROJECT_OVERVIEW_INFO = {
    sakhalin2: {
        url: 'https://www.sakhalinenergy.ru/ru/company/assets/',
        ru: {
            badge: 'Проект «Сахалин-2»',
            status: 'Действующий • 365 дн/год',
            statusTone: 'emerald',
            title: 'Нефтегазовый комплекс о. Сахалин',
            subtitle: 'Добыча на шельфе • 800 км магистралей • Первый в России завод СПГ',
            paragraphs: [
                '«Сахалин-2» — один из крупнейших в мире комплексных нефтегазовых проектов, работающий на северо-восточном шельфе Сахалина и южном побережье острова. В его состав вошли первая в России ледостойкая морская платформа «Моликпак» (ПА-А, 1999) и первый в стране завод по сжижению природного газа (СПГ) в Пригородном (2009).',
                'Газ с платформы ЛУН-А и нефть с платформ ПА-А и ПА-Б поступают на береговой комплекс ОБТК (Ноглики), после чего по двум 800-километровым транссахалинским трубопроводам (через НКС № 2 в Поронайске) доставляются на юг острова — для производства СПГ, газификации Сахалина и круглогодичного экспорта нефти сорта Sakhalin Blend.'
            ],
            metrics: [
                { l: 'Оператор', v: 'ООО «Сахалинская Энергия»' },
                { l: 'Запуск СРП / СПГ', v: '1999 (нефть) / 2009 (СПГ)' },
                { l: 'Выпуск СПГ', v: '~10,3 млн т/год (проект 9,6)' },
                { l: 'Месторождения', v: 'Пильтун-Астохское, Лунское' },
                { l: 'Магистрали', v: '~800 км (газ + нефть)' },
                { l: 'Экспорт / Рынки', v: 'АТР (Япония, Китай, Корея)' }
            ],
            facts: [
                '3 морские ледостойкие платформы (ПА-А «Моликпак», ПА-Б и ЛУН-А) работают круглый год при толщине льда до 1,5 м.',
                'Завод СПГ в Пригородном стабильно работает выше проектной мощности благодаря модернизации технологических линий.',
                'Порт Пригородное в заливе Анива — незамерзающий экспортный хаб с двумя резервуарами СПГ по 100 000 м³ и выносным причалом ТОН.',
                'Трасса магистралей пересекает сейсмоактивные разломы и оборудована специальными скользящими опорами и автоматической защитой.'
            ],
            siteLabel: 'Открыть раздел объектов на sakhalinenergy.ru',
            sources: 'Источники (актуальность 2025–2026 гг.): ООО «Сахалинская Энергия» (sakhalinenergy.ru), ПАО «Совкомфлот», Минэнерго РФ, открытая отчётность по производству СПГ (10,3 млн т в 2025 г.) и спутниковые карты льдов (MODIS / Росгидромет).'
        },
        en: {
            badge: 'Sakhalin-2 Project',
            status: 'Active • Year-round',
            statusTone: 'emerald',
            title: 'Sakhalin Island Oil & LNG System',
            subtitle: 'Offshore Platforms • ~800 km Trunklines • Russia\'s First LNG Plant',
            paragraphs: [
                'Sakhalin-2 is one of the world\'s largest integrated oil and gas developments, spanning northeast Sakhalin\'s offshore fields and the southern export coast. It launched Russia\'s first ice-class offshore platform Molikpaq (PA-A, 1999) and the country\'s first LNG plant at Prigorodnoye (2009).',
                'Gas from LUN-A and crude oil from PA-A and PA-B flow to the Onshore Processing Facility (OPF) near Nogliki, then travel roughly 800 km south via twin pipelines (boosted by BS-2 near Poronaysk) to feed the LNG plant, local Sakhalin gas supply, and the year-round Sakhalin Blend oil export terminal.'
            ],
            metrics: [
                { l: 'Operator', v: 'Sakhalin Energy LLC' },
                { l: 'Start-up', v: '1999 (oil) / 2009 (LNG)' },
                { l: 'LNG Output', v: '~10.3 mln t/yr (design 9.6)' },
                { l: 'Fields', v: 'Piltun-Astokhskoye, Lunskoye' },
                { l: 'Pipelines', v: '~800 km (gas + oil)' },
                { l: 'Main Markets', v: 'Asia-Pacific (LNG & oil)' }
            ],
            facts: [
                'Three ice-resistant offshore platforms (PA-A Molikpaq, PA-B, LUN-A) operate 365 days a year in heavy Sea of Okhotsk ice.',
                'The Prigorodnoye LNG plant consistently runs above its 9.6 mln t/yr nameplate capacity.',
                'Prigorodnoye port in Aniva Bay stays ice-free for LNG carriers and Aframax oil tankers loading at the offshore SPM.',
                'The 800 km pipeline corridor uses seismic-resistant supports and automated shut-off valves across fault zones.'
            ],
            siteLabel: 'Open official assets page (sakhalinenergy.ru)',
            sources: 'Sources (2025–2026 data): Sakhalin Energy LLC (sakhalinenergy.ru), official LNG output reports, and MODIS / Roshydromet winter sea-ice charts.'
        }
    },
    sakhalin1: {
        url: 'https://www.rosneft.ru/business/Upstream/Offshore/Sakhalin_1/',
        ru: {
            badge: 'Проект «Сахалин-1»',
            status: 'Действующий • Нефть и газ',
            statusTone: 'orange',
            title: 'Шельф Сахалина и экспорт через Де-Кастри',
            subtitle: 'Чайво • Одопту • Аркутун-Даги • Терминал Де-Кастри (Хабаровский край)',
            paragraphs: [
                '«Сахалин-1» разрабатывает три крупных шельфовых месторождения на северо-востоке Сахалина — Чайво, Одопту и Аркутун-Даги. Проект известен инженерными рекордами сверхдальнего наклонно-направленного бурения с берега под морское дно (буровая установка «Ястреб» бурила скважины длиной свыше 15 км).',
                'Добытая нефть премиального сорта Sokol проходит подготовку на береговом комплексе (БКП) Чайво и перекачивается по 226-километровому нефтепроводу через остров и дно Татарского пролива на материковый терминал Де-Кастри, откуда круглогодично отгружается танкерами ледового класса в страны АТР.'
            ],
            metrics: [
                { l: 'Оператор', v: 'ООО «Сахалин-1» (Роснефть)' },
                { l: 'Начало добычи', v: '2005 (Чайво) / 2015 (Беркут)' },
                { l: 'Сорт нефти', v: 'Sokol (лёгкая малосернистая)' },
                { l: 'Месторождения', v: 'Чайво, Одопту, Аркутун-Даги' },
                { l: 'Нефтепровод', v: '226 км Чайво → Де-Кастри' },
                { l: 'Рекорд бурения', v: 'Скважины > 15 км (БУ «Ястреб»)' }
            ],
            facts: [
                'Платформа «Беркут» на Аркутун-Даги — одна из крупнейших нефтедобывающих платформ в России (общая масса > 200 тыс. т).',
                'Платформа «Орлан» работает на Чайво с 2005 года, а береговая БУ «Ястреб» осваивает удалённые морские пласты прямо с косы.',
                'Терминал Де-Кастри в бухте Чихачёва оснащён выносным причальным устройством (ВПУ) в 5,7 км от берега для танкеров Aframax.',
                'Попутный газ проекта используется для поддержания пластового давления и поставляется в систему газоснабжения Хабаровского края.'
            ],
            siteLabel: 'Открыть страницу проекта на rosneft.ru',
            sources: 'Источники (актуальность 2025–2026 гг.): ПАО «НК «Роснефть» (rosneft.ru), ООО «Сахалин-1», открытые данные по отгрузкам терминала Де-Кастри и спутниковые карты льдов Татарского пролива.'
        },
        en: {
            badge: 'Sakhalin-1 Project',
            status: 'Active • Oil & Gas',
            statusTone: 'orange',
            title: 'Offshore Fields & De-Kastri Oil Export',
            subtitle: 'Chayvo • Odoptu • Arkutun-Dagi • De-Kastri Terminal (Mainland)',
            paragraphs: [
                'Sakhalin-1 develops three major offshore fields off northeast Sakhalin: Chayvo, Odoptu, and Arkutun-Dagi. The project is famous for world-record extended-reach drilling from onshore coastal pads deep under the Sea of Okhotsk (wells exceeding 15 km drilled by the Yastreb rig).',
                'Light sweet Sokol crude oil is processed at the Chayvo Onshore Processing Facility and pumped through a 226 km pipeline across Sakhalin and beneath the Tatar Strait to the mainland De-Kastri terminal for year-round export by ice-class tankers.'
            ],
            metrics: [
                { l: 'Operator', v: 'Sakhalin-1 LLC (Rosneft)' },
                { l: 'First Oil', v: '2005 (Chayvo) / 2015 (Berkut)' },
                { l: 'Crude Grade', v: 'Sokol (light sweet crude)' },
                { l: 'Fields', v: 'Chayvo, Odoptu, Arkutun-Dagi' },
                { l: 'Pipeline', v: '226 km Chayvo → De-Kastri' },
                { l: 'Drilling Record', v: '> 15 km wells (Yastreb rig)' }
            ],
            facts: [
                'The Berkut platform at Arkutun-Dagi is one of Russia\'s largest offshore rigs (over 200,000 tons total weight).',
                'The Orlan offshore platform and onshore Yastreb rig jointly tap reservoirs beneath the Sea of Okhotsk.',
                'De-Kastri terminal loads Aframax tankers year-round via an offshore single-point mooring (SPM) 5.7 km from shore.',
                'Natural gas from Chayvo supports reservoir pressure and supplies regional consumers in Khabarovsk Krai.'
            ],
            siteLabel: 'Open project page on rosneft.ru',
            sources: 'Sources (2025–2026 data): Rosneft (rosneft.ru), Sakhalin-1 LLC, public De-Kastri terminal operational data, and Tatar Strait winter sea-ice satellite imagery.'
        }
    },
    sakhalin3: {
        url: 'https://shelf-dobycha.gazprom.ru/',
        ru: {
            badge: 'Проект «Сахалин-3»',
            status: 'Киринское работает • Южно-Киринское в освоении',
            statusTone: 'sky',
            title: 'Киринский блок — подводная добыча газа',
            subtitle: 'Первые в России полностью подводные добычные комплексы (ПДК)',
            paragraphs: [
                'Проект «Сахалин-3» (Киринский блок) реализует ПАО «Газпром» (оператор — ООО «Газпром добыча шельф Южно-Сахалинск»). Это первый в истории российской нефтегазовой отрасли проект, где добыча углеводородов ведётся полностью под водой — с помощью подводных добычных комплексов (ПДК) на морском дне без строительства надводных платформ.',
                'Киринское газоконденсатное месторождение (28 км от берега, глубина моря ~90 м) работает в штатном режиме и подаёт газ на береговой технологический комплекс (БТК), а далее в магистраль СХВ. Крупнейшее Южно-Киринское месторождение (запасы C1+C2: 814,5 млрд м³ газа, 130 млн т конденсата, 3,8 млн т нефти) находится на этапе обустройства с плановым вводом в 2027–2028 гг.'
            ],
            metrics: [
                { l: 'Оператор', v: 'Газпром добыча шельф' },
                { l: 'Киринское ГКМ', v: 'Работает (с 2013–2014 гг.)' },
                { l: 'Южно-Киринское', v: 'В освоении (2027–2028)' },
                { l: 'Глубина моря', v: '90 м (Кир.) / 110–320 м (ЮК)' },
                { l: 'Технология', v: '100% подводные ПДК на дне' },
                { l: 'Приём газа', v: 'БТК → ГКС «Сахалин» → СХВ' }
            ],
            facts: [
                'Подводные комплексы не боятся дрейфующих льдов и штормов — всё оборудование находится на дне Охотского моря.',
                'Управление подводной фонтанной арматурой ведётся дистанционно по шлангокабелю прямо с берегового пульта БТК.',
                'Южно-Киринское месторождение станет главной ресурсной базой для поставок газа на Дальний Восток и по «Дальневосточному маршруту» в Китай.',
                'На карте Южно-Киринское отмечено красным знаком ✕, так как оно ещё строится и не подаёт газ в трубу.'
            ],
            siteLabel: 'Открыть сайт «Газпром добыча шельф»',
            sources: 'Источники (актуальность 2025–2026 гг.): ПАО «Газпром», ООО «Газпром добыча шельф Южно-Сахалинск» (shelf-dobycha.gazprom.ru), отраслевые материалы по освоению Киринского блока.'
        },
        en: {
            badge: 'Sakhalin-3 Project',
            status: 'Kirinskoye Active • South Kirinskoye In Development',
            statusTone: 'sky',
            title: 'Kirinsky Block — Subsea Gas Production',
            subtitle: 'Russia\'s First 100% Seabed Production Complexes (Zero Platforms)',
            paragraphs: [
                'Sakhalin-3 (Kirinsky Block) is developed by Gazprom (operated by Gazprom Dobycha Shelf Yuzhno-Sakhalinsk). It is Russia\'s first offshore project producing gas entirely from seabed wellheads and subsea manifolds, without any surface platforms.',
                'Kirinskoye gas condensate field (28 km offshore, ~90 m depth) actively pipes gas along the seabed to the Onshore Processing Facility (BTK) and into the SHV trunkline. The giant South Kirinskoye field (814.5 bcm gas, 130 mln t condensate, 3.8 mln t oil) is currently under development for start-up around 2027–2028.'
            ],
            metrics: [
                { l: 'Operator', v: 'Gazprom Dobycha Shelf' },
                { l: 'Kirinskoye Field', v: 'Active (since 2013–2014)' },
                { l: 'South Kirinskoye', v: 'Under development (2027–2028)' },
                { l: 'Water Depth', v: '90 m / 110–320 m' },
                { l: 'Technology', v: '100% subsea seabed units' },
                { l: 'Gas Delivery', v: 'BTK → CS Sakhalin → SHV' }
            ],
            facts: [
                'Subsea hardware sits safely on the Sea of Okhotsk floor, immune to heavy drifting sea ice and winter storms.',
                'All subsea Christmas trees and valves are controlled remotely from the onshore BTK control room via umbilical cables.',
                'South Kirinskoye will serve as the core supply hub for Far East gasification and the Far Eastern export route to China.',
                'On the map, South Kirinskoye is marked with a red ✕ because it is not yet producing.'
            ],
            siteLabel: 'Open Gazprom Dobycha Shelf website',
            sources: 'Sources (2025–2026 data): Gazprom, Gazprom Dobycha Shelf Yuzhno-Sakhalinsk (shelf-dobycha.gazprom.ru), and official Kirinsky Block development updates.'
        }
    },
    shv: {
        url: 'https://tomsk-tr.gazprom.ru/',
        ru: {
            badge: 'МГП СХВ',
            status: 'Действующий • Расширение мощности',
            statusTone: 'rose',
            title: 'Сахалин — Хабаровск — Владивосток',
            subtitle: 'Главная газотранспортная артерия Дальнего Востока (> 1 820 км)',
            paragraphs: [
                'Магистральный газопровод «Сахалин — Хабаровск — Владивосток» (СХВ) — первая межрегиональная газотранспортная система на Востоке России, введённая в эксплуатацию в 2011 году. Она берёт газ с шельфа Сахалина (ГКС «Сахалин»), пересекает пролив Невельского по дну моря и идёт по материку через Комсомольск-на-Амуре и Хабаровск до Владивостока и острова Русский.',
                'Сейчас на базе СХВ реализуется масштабное расширение — «Дальневосточный маршрут» (отвод в районе Дальнереченска к границе с Китаем) и перспективная перемычка для объединения восточной газовой системы с магистралью «Сила Сибири».'
            ],
            metrics: [
                { l: 'Эксплуатация', v: 'Газпром трансгаз Томск' },
                { l: 'Год запуска', v: '2011 год (1-й пусковой)' },
                { l: 'Протяжённость', v: '> 1 820 км (Ø 1220 мм)' },
                { l: 'Давление / мощн.', v: '9,8 МПа • до 30 млрд м³/г' },
                { l: 'Ключевые узлы', v: 'ГКС Сахалин, КС Хабаровск, Русский' },
                { l: 'Перспектива', v: 'Дальневосточный маршрут / СС' }
            ],
            facts: [
                'Снабжает природным газом ТЭЦ и промышленность Хабаровского и Приморского краёв, включая объекты на острове Русский.',
                'На трассе работают головная станция ГКС «Сахалин» и линейные компрессорные станции (КС-4 «Амурская», КС-6 «Хабаровская», КС-9 «Дальнереченская», КС-12 «Приморская»).',
                'Подводный переход через пролив Невельского выполнен в две нитки с защитным обетонированием на дне пролива.',
                'Строительство перемычки Белогорск — Хабаровск свяжет МГП СХВ с «Силой Сибири» в единый газовый контур Востока России.'
            ],
            siteLabel: 'Открыть сайт «Газпром трансгаз Томск»',
            sources: 'Источники (актуальность 2025–2026 гг.): ПАО «Газпром», ООО «Газпром трансгаз Томск» (tomsk-tr.gazprom.ru), официальные схемы Восточной газовой программы и «Дальневосточного маршрута».'
        },
        en: {
            badge: 'SHV Gas Trunkline',
            status: 'Active • Expanding Capacity',
            statusTone: 'rose',
            title: 'Sakhalin – Khabarovsk – Vladivostok',
            subtitle: 'Main Gas Artery of Russia\'s Far East (> 1,820 km)',
            paragraphs: [
                'The Sakhalin – Khabarovsk – Vladivostok (SHV) gas trunkline is the first cross-regional gas transmission system in Russia\'s Far East, commissioned in 2011. Starting at Sakhalin Head CS, it crosses beneath Nevelskoy Strait to the mainland and runs south through Komsomolsk-on-Amur and Khabarovsk to Vladivostok and Russky Island.',
                'The corridor is currently expanding with the Far Eastern export branch (near Dalnerechensk toward the Chinese border) and a planned west interconnect linking the Far East system with the Power of Siberia pipeline.'
            ],
            metrics: [
                { l: 'Operator', v: 'Gazprom Transgaz Tomsk' },
                { l: 'Commissioned', v: '2011 (Phase 1)' },
                { l: 'Total Length', v: '> 1,820 km (1220 mm pipe)' },
                { l: 'Pressure / Cap.', v: '9.8 MPa • up to 30 bcm/yr' },
                { l: 'Major Nodes', v: 'Sakhalin CS, Khabarovsk, Russky' },
                { l: 'Expansion', v: 'Far Eastern Route / Siberia link' }
            ],
            facts: [
                'Supplies gas to power plants, industry, and cities across Khabarovsk Krai and Primorsky Krai, down to Russky Island.',
                'Operates with Head CS Sakhalin and mainland line stations (CS-4 Amurskaya, CS-6 Khabarovskaya, CS-9 Dalnerechenskaya, CS-12 Primorskaya).',
                'Crosses the shallow, ice-prone Nevelskoy Strait via concrete-weighted twin subsea pipelines.',
                'The upcoming Belogorsk–Khabarovsk link will connect SHV directly to the Power of Siberia trunkline.'
            ],
            siteLabel: 'Open Gazprom Transgaz Tomsk website',
            sources: 'Sources (2025–2026 data): Gazprom, Gazprom Transgaz Tomsk (tomsk-tr.gazprom.ru), and official Eastern Gas Program / Far Eastern Route materials.'
        }
    }
};

function openProjectInfoModal(keepOpen = false) {
    const modal = document.getElementById('project-info-modal');
    if (!modal) return;
    if (!keepOpen && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        return;
    }
    if (typeof closeSettingsModal === 'function') closeSettingsModal();
    const en = (typeof isEn === 'function' && isEn());
    const dataSet = PROJECT_OVERVIEW_INFO[activeProject] || PROJECT_OVERVIEW_INFO.sakhalin2;
    const info = en ? dataSet.en : dataSet.ru;

    const sub = document.getElementById('proj-info-sub');
    const statusEl = document.getElementById('proj-info-status');
    const title = document.getElementById('proj-info-title');
    const subtitle = document.getElementById('proj-info-subtitle');
    const desc = document.getElementById('proj-info-desc');
    const grid = document.getElementById('proj-info-metrics');
    const factsTitle = document.getElementById('proj-info-facts-title');
    const factsList = document.getElementById('proj-info-facts');
    const siteBtn = document.getElementById('proj-info-site-btn');
    const siteText = document.getElementById('proj-info-site-text');

    if (sub) sub.textContent = info.badge;
    if (statusEl) {
        statusEl.textContent = info.status;
        const toneMap = {
            emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
            orange:  'bg-orange-500/15 text-orange-300 border-orange-400/30',
            sky:     'bg-sky-500/15 text-sky-300 border-sky-400/30',
            rose:    'bg-rose-500/15 text-rose-300 border-rose-400/30'
        };
        statusEl.className = 'text-[10px] font-bold px-2 py-0.5 rounded-md border ' + (toneMap[info.statusTone] || toneMap.emerald);
    }
    if (title) title.textContent = info.title;
    if (subtitle) subtitle.textContent = info.subtitle || '';
    if (desc) {
        desc.innerHTML = (info.paragraphs || []).map(p => `<p>${p}</p>`).join('');
    }
    if (grid) {
        grid.innerHTML = (info.metrics || []).map(m => `
            <div class="bg-slate-950/75 border border-slate-800 rounded-xl px-3 py-2">
                <div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">${m.l}</div>
                <div class="text-[11px] font-extrabold text-white mt-0.5 leading-snug">${m.v}</div>
            </div>
        `).join('');
    }
    if (factsTitle) factsTitle.textContent = en ? 'Key Project Highlights' : 'Ключевые особенности проекта';
    if (factsList) {
        factsList.innerHTML = (info.facts || []).map(f => `
            <li class="flex items-start gap-2">
                <span class="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style="background: var(--proj-accent, #34d399);"></span>
                <span>${f}</span>
            </li>
        `).join('');
    }
    if (siteBtn && dataSet.url) siteBtn.href = dataSet.url;
    if (siteText) siteText.textContent = info.siteLabel || (en ? 'Open operator website' : 'Открыть сайт оператора');

    const sourcesEl = document.getElementById('proj-info-sources');
    const scaleNoteEl = document.getElementById('proj-info-scale-note');
    if (sourcesEl) sourcesEl.textContent = info.sources || '';
    if (scaleNoteEl) {
        scaleNoteEl.textContent = en
            ? 'Note: Geographic coordinates and pipeline corridors follow real geography; 3D facility models are enlarged for visual clarity.'
            : 'Примечание: географические координаты, ледовые границы и трассы соответствуют реальным, 3D-модели объектов увеличены для наглядности.';
    }

    modal.classList.remove('hidden');
}

function closeProjectInfoModal() {
    const modal = document.getElementById('project-info-modal');
    if (modal) modal.classList.add('hidden');
}

// =========================================================================
// ОКНО «НАСТРОЙКИ КАРТЫ» (погода, отображение, камера, язык, качество 3D)
// =========================================================================
let graphicsQualityMode = 'auto'; // 'low' | 'auto' | 'high'

function setGraphicsQuality(mode, silent = false) {
    graphicsQualityMode = (mode === 'low' || mode === 'high') ? mode : 'auto';
    try { localStorage.setItem('sakhalin_gfx_quality', graphicsQualityMode); } catch (_) {}
    if (typeof renderer !== 'undefined' && renderer) {
        const dpr = window.devicePixelRatio || 1;
        const isMob = typeof isMobileViewport === 'function' && isMobileViewport();
        let targetDpr = Math.min(dpr, isMob ? 1.35 : 1.75);
        if (graphicsQualityMode === 'low') targetDpr = 1.0;
        else if (graphicsQualityMode === 'high') targetDpr = Math.min(dpr, isMob ? 1.65 : 2.25);
        renderer.setPixelRatio(targetDpr);
    }
    syncSettingsModalUI();
    if (!silent) {
        const en = (typeof isEn === 'function' && isEn());
        const names = en
            ? { low: '3D quality: Eco (higher FPS)', auto: '3D quality: Auto', high: '3D quality: High sharpness' }
            : { low: 'Качество 3D: Эконом (выше FPS)', auto: 'Качество 3D: Авто', high: 'Качество 3D: Высокое (макс. чёткость)' };
        showToast(names[graphicsQualityMode]);
    }
}

function initSavedGraphicsQuality() {
    let saved = 'auto';
    try { saved = localStorage.getItem('sakhalin_gfx_quality') || 'auto'; } catch (_) {}
    setGraphicsQuality(saved, true);
}

function syncSettingsModalUI() {
    const en = (typeof isEn === 'function' && isEn());
    const setTxt = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };

    setTxt('settings-title', en ? 'Map Settings' : 'Настройки карты');
    setTxt('settings-subtitle', en ? 'Atmosphere, visibility, camera & graphics' : 'Атмосфера, вид, камера и графика');
    setTxt('set-sec-weather', en ? 'Weather & Time of Day' : 'Погода и время суток');
    setTxt('set-weather-0-lbl', en ? 'Summer • Day' : 'Лето • День');
    setTxt('set-weather-1-lbl', en ? 'Snow • Day' : 'Снег • День');
    setTxt('set-weather-2-lbl', en ? 'Snow • Night' : 'Снег • Ночь');
    setTxt('set-sec-display', en ? 'Map Display & Effects' : 'Отображение и эффекты');
    setTxt('set-lbl-labels', en ? 'Object labels & tags' : 'Метки и подписи объектов');
    setTxt('set-lbl-sound', en ? 'Ocean & wind ambient sound' : 'Звук океана и ветра');
    setTxt('set-lbl-flow', en ? 'Pipeline flow animation' : 'Анимация потока по трубам');
    setTxt('set-lbl-subsea', en ? 'Subsea X-Ray mode' : 'Подводный режим (X-Ray дна)');
    setTxt('set-lbl-bg-projects', en ? 'Dimmed neighbor projects' : 'Соседние проекты на фоне');
    setTxt('set-sec-camera', en ? 'Camera & Quick Modes' : 'Камера и быстрые режимы');
    setTxt('set-lbl-top', en ? 'Top View (2D)' : 'Вид сверху');
    setTxt('set-lbl-reset', en ? 'Reset Overview' : 'Сбросить обзор');
    const tourActive = (typeof tourState !== 'undefined' && tourState.active);
    setTxt('set-lbl-tour', tourActive ? (en ? 'Stop Tour' : 'Стоп тур') : (en ? 'Auto-Tour' : 'Автотур'));
    setTxt('set-lbl-cinema', en ? 'Cinema Mode' : 'Кино-режим');
    setTxt('set-lbl-globe', en ? '3D Planet' : '3D-планета');
    setTxt('set-lbl-screenshot', en ? 'Snapshot PNG' : 'Снимок PNG');
    setTxt('set-sec-lang', en ? 'Language' : 'Язык интерфейса');
    setTxt('set-sec-gfx', en ? '3D Quality' : 'Качество 3D');
    setTxt('set-gfx-low', en ? 'Eco' : 'Эконом');
    setTxt('set-gfx-auto', en ? 'Auto' : 'Авто');
    setTxt('set-gfx-high', en ? 'High' : 'Выс.');

    // Активная кнопка погоды
    [0, 1, 2].forEach(idx => {
        const b = document.getElementById('set-weather-' + idx);
        if (!b) return;
        const active = (weatherModeIndex === idx);
        b.classList.toggle('proj-badge-accent', active);
        b.classList.toggle('text-white', active);
        b.classList.toggle('text-slate-300', !active);
    });

    // Бейджи тумблеров ВКЛ / ВЫКЛ
    const styleBadge = (id, isOn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = isOn ? (en ? 'ON' : 'ВКЛ') : (en ? 'OFF' : 'ВЫКЛ');
        el.className = isOn
            ? 'text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shrink-0'
            : 'text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0';
    };
    styleBadge('set-badge-labels', Boolean(areLabelsVisible));
    styleBadge('set-badge-sound', typeof isSoundEnabled !== 'undefined' ? Boolean(isSoundEnabled) : true);
    styleBadge('set-badge-flow', Boolean(isFlowEnabled));
    styleBadge('set-badge-subsea', Boolean(isSubseaMode));
    styleBadge('set-badge-bg-projects', typeof showBackgroundProjects !== 'undefined' ? Boolean(showBackgroundProjects) : true);

    // Язык
    const ruBtn = document.getElementById('set-lang-ru');
    const enBtn = document.getElementById('set-lang-en');
    if (ruBtn) {
        ruBtn.classList.toggle('proj-badge-accent', !en);
        ruBtn.classList.toggle('text-slate-300', en);
    }
    if (enBtn) {
        enBtn.classList.toggle('proj-badge-accent', en);
        enBtn.classList.toggle('text-slate-300', !en);
    }

    // Графика
    ['low', 'auto', 'high'].forEach(m => {
        const b = document.getElementById('set-gfx-' + m);
        if (!b) return;
        const active = (graphicsQualityMode === m);
        b.classList.toggle('proj-badge-accent', active);
        b.classList.toggle('text-slate-300', !active);
    });
}

function openSettingsModal(keepOpen = false) {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    if (!keepOpen && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        return;
    }
    closeProjectInfoModal();
    syncSettingsModalUI();
    modal.classList.remove('hidden');
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
}

function setupMobileSwipeGestures() {
    const sbDrag = document.getElementById('sidebar-drag-area');
    let sbStartY = 0;
    if (sbDrag) {
        sbDrag.addEventListener('touchstart', e => {
            sbStartY = e.touches[0].clientY;
        }, { passive: true });
        sbDrag.addEventListener('touchend', e => {
            const dy = e.changedTouches[0].clientY - sbStartY;
            if (dy < -30) {
                setMobileSidebarFullscreen(true);
            } else if (dy > 40) {
                if (isMobileSidebarFullscreen) setMobileSidebarFullscreen(false);
                else closeMobileSidebar();
            }
        }, { passive: true });
    }

    const detailDrag = document.getElementById('detail-drag-area');
    let detailStartY = 0;
    if (detailDrag) {
        detailDrag.addEventListener('touchstart', e => {
            detailStartY = e.touches[0].clientY;
        }, { passive: true });
        detailDrag.addEventListener('touchend', e => {
            const dy = e.changedTouches[0].clientY - detailStartY;
            if (dy < -30) {
                if (mobileDetailStage === 'collapsed') setMobileDetailStage('normal');
                else setMobileDetailStage('fullscreen');
            } else if (dy > 40) {
                if (mobileDetailStage === 'fullscreen') setMobileDetailStage('normal');
                else if (mobileDetailStage === 'normal') setMobileDetailStage('collapsed');
                else closeDetailCard();
            }
        }, { passive: true });
    }
}

