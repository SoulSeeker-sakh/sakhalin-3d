'use strict';

// =========================================================================
// [BLOCK:ENGINE_LOOP]
// 10. ИНИЦИАЛИЗАЦИЯ THREE.JS И ЦИКЛ АНИМАЦИИ
// =========================================================================
function initScene() {
    if (window.__threeLoadErr || typeof window.THREE === 'undefined') {
        throw new Error(window.__threeLoadErr || 'Библиотека Three.js не загрузилась. Проверьте подключение к интернету.');
    }
    if (window.__controlsLoadErr || typeof THREE.OrbitControls === 'undefined') {
        throw new Error(window.__controlsLoadErr || 'Модуль THREE.OrbitControls не загрузился.');
    }

    const initPose = getAdaptiveCameraPose(false);
    DEFAULT_CAMERA_POS = initPose.pos;
    DEFAULT_CAMERA_TARGET = initPose.target;
    const topPose = getAdaptiveCameraPose(true);
    TOP_DOWN_CAMERA_POS = topPose.pos;
    TOP_DOWN_CAMERA_TARGET = topPose.target;

    cameraTransition.startPos = new THREE.Vector3();
    cameraTransition.endPos = new THREE.Vector3();
    cameraTransition.startTarget = new THREE.Vector3();
    cameraTransition.endTarget = new THREE.Vector3();

    _tmpShipPos = new THREE.Vector3();
    _tmpShipTangent = new THREE.Vector3();
    _tmpShipLook = new THREE.Vector3();
    _tmpShipDelta = new THREE.Vector3();
    _tmpHeliPos = new THREE.Vector3();
    _tmpHeliTan = new THREE.Vector3();
    _tmpHeliLook = new THREE.Vector3();

    _dayBgColor = new THREE.Color(0x031326);
    _nightBgColor = new THREE.Color(0x020714);
    _daySunColor = new THREE.Color(0xfffbeb);
    _nightMoonColor = new THREE.Color(0x93c5fd);
    _summerTaigaTint = new THREE.Color(0xffffff);
    _winterTaigaTint = new THREE.Color(0xdbeeff);
    _iceDummy = new THREE.Object3D();
    compassNeedleEl = document.getElementById('compass-needle');

    clock = new THREE.Clock();

    loadSavedUrls();
    buildSmoothedCoastline();

    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = _dayBgColor.clone();
    scene.fog = new THREE.FogExp2(0x031326, 0.00095);

    camera = new THREE.PerspectiveCamera(42, viewportWidth / viewportHeight, 0.5, 2400);
    camera.position.copy(DEFAULT_CAMERA_POS);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileViewport() ? 1.35 : 2));
    renderer.setSize(viewportWidth, viewportHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.copy(DEFAULT_CAMERA_TARGET);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.minDistance = 6;
    controls.maxDistance = 420;
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
    };
    controls.addEventListener('start', () => {
        cameraTransition.active = false;
        if (tourState.active) {
            stopAutoTour(true);
        }
    });
    controls.update();

    hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.86);
    scene.add(hemiLight);

    dirLight = new THREE.DirectionalLight(0xfffbeb, 1.32);
    dirLight.position.set(75, 120, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 340;
    const d = 145;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    fillLight = new THREE.DirectionalLight(0x38bdf8, 0.35);
    fillLight.position.set(-70, 50, -60);
    scene.add(fillLight);

    buildRealisticOcean();
    if (waterMesh) waterMesh.scale.set(3.2, 3.2, 1.0);
    if (waterUniforms) waterUniforms.uFarEastMix.value = 1.0;
    buildSakhalinIsland();
    buildNeighboringIslands();
    buildSakhalinNatureLandmarks();
    buildCoastalSurf();

    sakhalin2Group = new THREE.Group();
    scene.add(sakhalin2Group);

    buildFacilitiesAndShips();
    buildSubseaStructures();
    buildNauticalGrid();
    buildSeaIceFloes();
    buildPipelines();
    buildSakhalinTaiga();
    buildCityLights();
    buildWorldLowPolyClouds();
    buildSakhalinNightHalos();
    buildSupplyHelicopter();
    createDomMarkers();
    renderSidebarList();
    setupMobileSwipeGestures();

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    renderer.domElement.addEventListener('pointerdown', e => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('pointerup', e => {
        const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        if (moveDist > 8) return;

        mouse.x = (e.clientX / viewportWidth) * 2 - 1;
        mouse.y = -(e.clientY / viewportHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const rawClickables = isFarEastProject() ? s1ClickableObjects : clickableObjects;
        const projIds = (isFarEastProject() && typeof PROJECT_FACILITY_IDS !== 'undefined') ? PROJECT_FACILITY_IDS[activeProject] : null;
        const baseClickables = projIds ? rawClickables.filter(o => projIds.includes(o.userData.facilityId)) : rawClickables;
        const activeClickables = currentFilter === 'all'
            ? baseClickables
            : baseClickables.filter(obj => obj.userData.category === currentFilter);

        const hits = raycaster.intersectObjects(activeClickables, false);
        if (hits.length > 0) {
            const hitId = hits[0].object.userData.facilityId;
            if (hitId) selectFacility(hitId, true);
        }
    });

    renderer.domElement.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        mouse.x = (e.clientX / viewportWidth) * 2 - 1;
        mouse.y = -(e.clientY / viewportHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const rawClickables = isFarEastProject() ? s1ClickableObjects : clickableObjects;
        const projIds = (isFarEastProject() && typeof PROJECT_FACILITY_IDS !== 'undefined') ? PROJECT_FACILITY_IDS[activeProject] : null;
        const baseClickables = projIds ? rawClickables.filter(o => projIds.includes(o.userData.facilityId)) : rawClickables;
        const hits = raycaster.intersectObjects(baseClickables, false);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    });

    document.querySelectorAll('.project-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchProjectTab(btn.dataset.project);
        });
    });

    const bindClick = (id, fn) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', fn);
    };

    bindClick('btn-reset-camera', resetCameraView);
    bindClick('btn-top-view', flyToTopView);
    bindClick('btn-toggle-flow', toggleFlowState);
    bindClick('btn-toggle-labels', toggleLabelsState);
    bindClick('btn-toggle-weather', cycleWeatherMode);
    bindClick('btn-toggle-theme', cycleWeatherMode);
    bindClick('btn-toggle-winter', cycleWeatherMode);
    bindClick('btn-toggle-tour', toggleAutoTour);
    bindClick('btn-toggle-lang', () => { if (typeof toggleLanguage === 'function') toggleLanguage(); });
    bindClick('btn-mobile-lang', () => { if (typeof toggleLanguage === 'function') toggleLanguage(); });
    bindClick('btn-globe-lang', () => { if (typeof toggleLanguage === 'function') toggleLanguage(); });
    if (typeof applyLanguageToUI === 'function') applyLanguageToUI(true);

    bindClick('btn-mobile-objects', openMobileSidebar);
    bindClick('btn-mobile-tour', toggleAutoTour);
    bindClick('btn-mobile-flow', toggleFlowState);
    bindClick('btn-mobile-top', flyToTopView);
    bindClick('btn-mobile-reset', resetCameraView);
    bindClick('btn-mobile-labels', toggleLabelsState);
    bindClick('btn-mobile-weather', cycleWeatherMode);
    bindClick('btn-mobile-theme', cycleWeatherMode);
    bindClick('btn-mobile-winter', cycleWeatherMode);

    bindClick('compass-btn', orientCameraNorth);
    bindClick('btn-open-telemetry', toggleTelemetryPanel);
    bindClick('btn-close-telemetry', closeTelemetryPanel);
    bindClick('btn-quick-subsea', toggleSubseaMode);
    bindClick('btn-panel-subsea', toggleSubseaMode);
    bindClick('btn-panel-grid', toggleNauticalGrid);
    bindClick('btn-panel-nature', toggleNatureLayer);
    bindClick('btn-quick-sound', toggleSoundMode);
    bindClick('btn-panel-sound', toggleSoundMode);

    document.querySelectorAll('.preset-region-btn').forEach(btn => {
        btn.addEventListener('click', () => flyToRegionPreset(btn.dataset.preset));
    });

    const rateSlider = document.getElementById('production-rate-slider');
    if (rateSlider) {
        rateSlider.addEventListener('input', e => updateProductionTelemetry(e.target.value));
    }

    bindClick('btn-tour-prev', () => goToTourStep(tourState.index - 1));
    bindClick('btn-tour-next', () => goToTourStep(tourState.index + 1));
    bindClick('btn-tour-stop', () => stopAutoTour(true));

    bindClick('btn-close-card', closeDetailCard);
    bindClick('btn-prev-facility', () => cycleFacility(-1));
    bindClick('btn-next-facility', () => cycleFacility(1));
    bindClick('btn-close-sidebar', closeMobileSidebar);
    bindClick('mobile-backdrop', closeMobileSidebar);

    bindClick('btn-toggle-sidebar-size', () => {
        setMobileSidebarFullscreen(!isMobileSidebarFullscreen);
    });
    bindClick('btn-toggle-detail-size', () => {
        cycleMobileDetailSize();
    });

    const facSearchEl = document.getElementById('facility-search');
    if (facSearchEl) {
        facSearchEl.addEventListener('input', e => {
            currentSearchQuery = e.target.value || '';
            renderSidebarList();
        });
    }

    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            document.querySelectorAll('.filter-tab').forEach(b => {
                b.classList.remove('filter-active', 'bg-amber-500', 'text-slate-950', 'shadow');
                b.classList.add('text-slate-300');
            });
            btn.classList.add('filter-active', 'shadow');
            btn.classList.remove('text-slate-300');
            updateShipRouteHighlight();
            renderSidebarList();
        });
    });

    bindClick('btn-brand-title-card', () => openProjectInfoModal(false));
    bindClick('btn-project-info', () => openProjectInfoModal(false));
    bindClick('btn-close-proj-info', closeProjectInfoModal);
    bindClick('btn-take-screenshot', captureMapScreenshot);
    bindClick('btn-close-link-fb', closeLinkFallbackModal);

    // Окно «Настройки карты»
    bindClick('btn-open-settings', () => openSettingsModal(false));
    bindClick('btn-mobile-settings', () => openSettingsModal(false));
    bindClick('btn-close-settings', closeSettingsModal);
    bindClick('set-weather-0', () => setWeatherMode(0, false));
    bindClick('set-weather-1', () => setWeatherMode(1, false));
    bindClick('set-weather-2', () => setWeatherMode(2, false));
    bindClick('set-toggle-labels', toggleLabelsState);
    bindClick('set-toggle-sound', () => {
        if (typeof toggleSoundMode === 'function') {
            Promise.resolve(toggleSoundMode()).finally(() => syncSettingsModalUI());
        }
    });
    bindClick('set-toggle-flow', toggleFlowState);
    bindClick('set-toggle-subsea', () => {
        if (typeof toggleSubseaMode === 'function') toggleSubseaMode();
        syncSettingsModalUI();
    });
    bindClick('set-toggle-bg-projects', () => {
        if (typeof toggleBackgroundProjects === 'function') toggleBackgroundProjects();
    });
    bindClick('set-btn-top', () => { closeSettingsModal(); flyToTopView(); });
    bindClick('set-btn-reset', () => { closeSettingsModal(); resetCameraView(); });
    bindClick('set-btn-tour', () => { closeSettingsModal(); toggleAutoTour(); syncSettingsModalUI(); });
    bindClick('set-btn-cinema', () => { closeSettingsModal(); if (typeof toggleCinemaMode === 'function') toggleCinemaMode(true); });
    bindClick('set-btn-globe', () => { closeSettingsModal(); if (typeof openGlobeIntro === 'function') openGlobeIntro(); });
    bindClick('set-btn-screenshot', () => { closeSettingsModal(); setTimeout(captureMapScreenshot, 60); });
    bindClick('set-lang-ru', () => { if (typeof setLanguage === 'function') setLanguage('ru', false); });
    bindClick('set-lang-en', () => { if (typeof setLanguage === 'function') setLanguage('en', false); });
    bindClick('set-gfx-low', () => setGraphicsQuality('low', false));
    bindClick('set-gfx-auto', () => setGraphicsQuality('auto', false));
    bindClick('set-gfx-high', () => setGraphicsQuality('high', false));

    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal) {
        settingsModal.addEventListener('click', e => {
            if (e.target === settingsModal) closeSettingsModal();
        });
    }
    const projInfoSiteBtn = document.getElementById('proj-info-site-btn');
    if (projInfoSiteBtn) {
        projInfoSiteBtn.addEventListener('click', e => {
            e.preventDefault();
            const ds = PROJECT_OVERVIEW_INFO[activeProject] || PROJECT_OVERVIEW_INFO.sakhalin2;
            const label = (typeof isEn === 'function' && isEn()) ? ds.en.badge : ds.ru.badge;
            openVerifiedExternalLink(projInfoSiteBtn.href, label);
        });
    }
    if (typeof initSavedGraphicsQuality === 'function') initSavedGraphicsQuality();

    const projInfoModal = document.getElementById('project-info-modal');
    if (projInfoModal) {
        projInfoModal.addEventListener('click', e => {
            if (e.target === projInfoModal) closeProjectInfoModal();
        });
    }
    const linkFbModal = document.getElementById('link-fallback-modal');
    if (linkFbModal) {
        linkFbModal.addEventListener('click', e => {
            if (e.target === linkFbModal) closeLinkFallbackModal();
        });
    }

    const cardWebBtn = document.getElementById('card-website-btn');
    if (cardWebBtn) {
        cardWebBtn.addEventListener('click', e => {
            e.preventDefault();
            const activeFac = activeFacilityId
                ? getActiveFacilitiesList().find(f => f.id === activeFacilityId)
                : null;
            openVerifiedExternalLink(cardWebBtn.href, activeFac ? activeFac.name : '');
        });
    }

    const tbWikiBtn = document.getElementById('tb-wiki-btn');
    if (tbWikiBtn) {
        tbWikiBtn.addEventListener('click', e => {
            e.preventDefault();
            openVerifiedExternalLink(tbWikiBtn.href, (typeof isEn === 'function' && isEn()) ? 'Three Brothers Rocks Sakhalin' : 'Скалы Три Брата Сахалин');
        });
    }

    bindClick('btn-edit-url', () => {
        const box = document.getElementById('url-editor-box');
        if (box) box.classList.toggle('hidden');
    });

    bindClick('btn-save-url', () => {
        if (!activeFacilityId) return;
        const inp = document.getElementById('custom-url-input');
        const val = inp ? inp.value.trim() : '';
        if (!val) return;
        const normalizedUrl = /^https?:\/\//i.test(val) ? val : 'https://' + val;
        const fac = getActiveFacilitiesList().find(f => f.id === activeFacilityId);
        if (fac) {
            fac.url = normalizedUrl;
            saveCustomUrl(fac.id, normalizedUrl);
            selectFacility(fac.id, false);
            showToast('Ссылка для «' + fac.code + '» обновлена');
        }
    });

    window.addEventListener('resize', () => {
        viewportWidth = window.innerWidth;
        viewportHeight = window.innerHeight;
        if (!camera || !renderer) return;
        camera.aspect = viewportWidth / viewportHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewportWidth, viewportHeight);
        if (!isMobileViewport()) {
            setMobileBackdrop(false);
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (isGlobeIntroActive) {
        const pausedDt = clock ? Math.min(clock.getDelta(), 0.05) : 0.016;
        const pausedElapsed = clock ? clock.getElapsedTime() : (performance.now() * 0.001);
        if (typeof updateSoundDesignV25 === 'function') {
            updateSoundDesignV25(pausedDt, pausedElapsed);
        }
        return;
    }

    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    if (waterUniforms) {
        waterUniforms.uTime.value = elapsed;
    }
    if (surfUniforms) {
        surfUniforms.uTime.value = elapsed;
    }

    if (winterMix > 0.01 && seaIceMesh && seaIceMesh.visible) {
        // Собираем актуальные позиции всех видимых судов на воде (ледокол, нефтяной танкер, газовоз СПГ)
        const activeShipsS2 = (typeof getSakhalin2ActiveVessels === 'function') ? getSakhalin2ActiveVessels() : [];
        const iceAppear = Math.min(1.0, winterMix * winterMix * (3.0 - 2.0 * winterMix) * 1.15);

        for (let i = 0; i < seaIceFloes.length; i++) {
            const floe = seaIceFloes[i];
            if (floe.breakAmount === undefined) floe.breakAmount = 0;
            if (floe.shipPushX === undefined) floe.shipPushX = 0;
            if (floe.shipPushZ === undefined) floe.shipPushZ = 0;

            floe.z += dt * floe.driftSpeed;
            if (floe.z > floe.maxZ) {
                floe.z = floe.minZ;
                floe.x = floe.baseX;
                floe.breakAmount = 0;
                floe.shipPushX = 0;
                floe.shipPushZ = 0;
            }
            floe.rotY += dt * floe.rotSpeed;

            let pushed = false;
            for (let k = 0; k < seaIceObstacles.length; k++) {
                const ob = seaIceObstacles[k];
                const dx = floe.x - ob.x;
                const dz = floe.z - ob.z;
                const distSq = dx * dx + dz * dz;
                const avoidR = ob.r + 1.1;
                if (distSq < avoidR * avoidR) {
                    const dist = Math.sqrt(distSq) || 0.01;
                    const pushDirX = Math.abs(dx) < 0.25 ? 1.0 : Math.sign(dx);
                    const strength = (1.0 - dist / avoidR) * 4.8;
                    floe.x += pushDirX * strength * dt;
                    if (dist < ob.r) {
                        floe.x = ob.x + pushDirX * ob.r;
                    }
                    pushed = true;
                }
            }

            // Физическое раздвигание и проламывание льдин ледоколом, нефтяным танкером и газовозом СПГ
            let hitByShip = false;
            const curFx = floe.x + floe.shipPushX;
            const curFz = floe.z + floe.shipPushZ;
            for (let s = 0; s < activeShipsS2.length; s++) {
                const sh = activeShipsS2[s];
                const dx = curFx - sh.x;
                const dz = curFz - sh.z;
                const distSq = dx * dx + dz * dz;
                if (distSq < sh.r * sh.r) {
                    const dist = Math.sqrt(distSq) || 0.05;
                    const nx = dx / dist;
                    const nz = dz / dist;
                    const impact = 1.0 - dist / sh.r;
                    floe.shipPushX += nx * (2.6 + impact * 5.8) * Math.min(1, dt * 7.5);
                    floe.shipPushZ += nz * (2.6 + impact * 5.8) * Math.min(1, dt * 7.5);
                    floe.rotY += dt * (nx >= 0 ? 3.2 : -3.2);
                    if (impact * 1.35 > floe.breakAmount) {
                        floe.breakAmount = Math.min(1.0, impact * 1.35);
                    }
                    hitByShip = true;
                    pushed = true;
                }
            }

            if (!hitByShip) {
                const relax = Math.min(1, dt * 0.42);
                floe.shipPushX += (0 - floe.shipPushX) * relax;
                floe.shipPushZ += (0 - floe.shipPushZ) * relax;
                if (floe.breakAmount > 0) {
                    floe.breakAmount = Math.max(0, floe.breakAmount - dt * 0.22);
                }
            }

            if (floe.x < 34) {
                const inLand = isPointInPolygon(floe.x, floe.z, SAKHALIN_OUTLINE);
                const dShore = distanceToShoreline(floe.x, floe.z, SAKHALIN_OUTLINE);
                if (inLand || dShore < 1.25) {
                    floe.x += dt * (inLand ? 7.5 : 3.2);
                    pushed = true;
                }
            }

            if (!pushed) {
                floe.x += (floe.baseX - floe.x) * Math.min(1, dt * 0.45);
            }

            const fadeIn = Math.min(1.0, Math.max(0.0, (floe.z - floe.minZ) / 16.0));
            const fadeOut = Math.min(1.0, Math.max(0.0, (floe.maxZ - floe.z) / 24.0));
            const lifeScale = Math.min(fadeIn, fadeOut);
            const smoothLife = lifeScale * lifeScale * (3.0 - 2.0 * lifeScale);
            const crushScale = Math.max(0.28, 1.0 - floe.breakAmount * 0.65);

            _iceDummy.position.set(
                floe.x + floe.shipPushX,
                (floe.yBase || 0.08) - floe.breakAmount * 0.05 + Math.sin(elapsed * 1.4 + floe.phase) * 0.012,
                floe.z + floe.shipPushZ
            );
            _iceDummy.rotation.set(floe.breakAmount * 0.28, floe.rotY, floe.breakAmount * 0.22);
            _iceDummy.scale.set(
                Math.max(0.001, floe.scaleX * smoothLife * crushScale * iceAppear),
                Math.max(0.001, smoothLife * iceAppear),
                Math.max(0.001, floe.scaleZ * smoothLife * crushScale * iceAppear)
            );
            _iceDummy.updateMatrix();
            seaIceMesh.setMatrixAt(i, _iceDummy.matrix);
        }
        seaIceMesh.instanceMatrix.needsUpdate = true;
    }

    const targetWinter = isWinterMode ? 1.0 : 0.0;
    if (Math.abs(winterMix - targetWinter) > 0.001) {
        winterMix += (targetWinter - winterMix) * Math.min(1, dt * 1.35);
        if (Math.abs(winterMix - targetWinter) <= 0.003) winterMix = targetWinter;
        const smoothWinter = winterMix * winterMix * (3.0 - 2.0 * winterMix);
        if (typeof applyWinterTerrainBlend === 'function') {
            applyWinterTerrainBlend(smoothWinter);
        }
    }

    const targetNight = isNightMode ? 1.0 : 0.0;
    if (Math.abs(nightMix - targetNight) > 0.001) {
        nightMix += (targetNight - nightMix) * Math.min(1, dt * 3.2);
        if (Math.abs(nightMix - targetNight) <= 0.002) nightMix = targetNight;

        scene.background.lerpColors(_dayBgColor, _nightBgColor, nightMix);
        if (scene.fog) scene.fog.color.copy(scene.background);

        if (hemiLight) hemiLight.intensity = 0.86 - nightMix * 0.44;
        if (dirLight) {
            dirLight.intensity = 1.32 - nightMix * 0.70;
            dirLight.color.lerpColors(_daySunColor, _nightMoonColor, nightMix);
        }
        if (fillLight) fillLight.intensity = 0.35 + nightMix * 0.18;
        if (waterUniforms) waterUniforms.uNightMix.value = nightMix;
        if (surfUniforms) surfUniforms.uNightMix.value = nightMix;

        for (let i = 0; i < lighthouseBeamMats.length; i++) {
            lighthouseBeamMats[i].opacity = 0.28 + nightMix * 0.32;
        }
        updateTaigaPointsTint();
        updateNightAtmosphere();
        updateSakhalin1CloudsColor();
        if (cityLightsGroup && cityLightsMat) {
            cityLightsGroup.visible = nightMix > 0.03;
            cityLightsMat.opacity = nightMix * 0.92;
        }
        if (sakhalin1Built && s1CityLightsGroup && s1CityLightsMat) {
            s1CityLightsGroup.visible = (activeProject === 'sakhalin1' || activeProject === 'shv') && (nightMix > 0.03);
            s1CityLightsMat.opacity = nightMix * 0.92;
            updateNeighborLandsColor();
            updateSakhalin1CloudsColor();
            updateFarEastBackdropColor();
        }
    }

    if (subseaGroup && subseaGroup.visible) {
        for (let i = 0; i < subseaPulseNodes.length; i++) {
            const sn = subseaPulseNodes[i];
            sn.mesh.scale.setScalar(0.85 + Math.sin(elapsed * 4.5 + sn.phase) * 0.25);
        }
    }

    if (tourState.active && !cameraTransition.active) {
        tourState.timer += dt;
        const progress = Math.min(1, tourState.timer / tourState.stepDuration);
        const barEl = document.getElementById('tour-progress-bar');
        if (barEl) barEl.style.width = `${Math.round(progress * 100)}%`;

        const offsetX = camera.position.x - controls.target.x;
        const offsetZ = camera.position.z - controls.target.z;
        const orbitAngle = dt * 0.22;
        const cosA = Math.cos(orbitAngle);
        const sinA = Math.sin(orbitAngle);
        camera.position.x = controls.target.x + offsetX * cosA - offsetZ * sinA;
        camera.position.z = controls.target.z + offsetX * sinA + offsetZ * cosA;

        if (tourState.timer >= tourState.stepDuration) {
            goToTourStep(tourState.index + 1);
        }
    }

    for (let i = 0; i < flareFlames.length; i++) {
        const f = flareFlames[i];
        const rateBoost = 0.6 + productionRate * 0.45;
        const s = (0.88 + Math.sin(elapsed * 14 + f.phase) * 0.18) * rateBoost;
        f.flame.scale.set(0.85 + productionRate * 0.18, s, 0.85 + productionRate * 0.18);
        f.glow.scale.setScalar((0.9 + Math.cos(elapsed * 11 + f.phase) * 0.16) * rateBoost);
    }

    for (let i = 0; i < platformBeacons.length; i++) {
        const b = platformBeacons[i];
        b.mesh.visible = Math.sin(elapsed * 4.5 + b.phase) > 0.0;
    }

    for (let i = 0; i < platformRadars.length; i++) {
        const r = platformRadars[i];
        r.pivot.rotation.y += dt * r.speed;
    }

    for (let i = 0; i < lighthouseBeams.length; i++) {
        lighthouseBeams[i].rotation.y = elapsed * 0.75;
    }

    for (let i = 0; i < platformDetailLods.length; i++) {
        const lod = platformDetailLods[i];
        const distSq = camera.position.distanceToSquared(lod.parent.position);
        lod.detail.visible = distSq < lod.thresholdSq;
    }

    if (activeProject === 'sakhalin2') {
        if (supplyHelicopter) {
            supplyHelicopter.mainRotor.rotation.y += dt * 28.0;
            supplyHelicopter.tailRotor.rotation.x += dt * 36.0;
        }

        for (let i = 0; i < movingShips.length; i++) {
            const ship = movingShips[i];
            const prevX = ship.group.position.x;
            const prevZ = ship.group.position.z;

            const hasStops = ship.stops.length > 0;
            const stop = hasStops ? ship.stops[ship.nextStopIndex] : null;

            if (ship.state === 'docked' && stop) {
                ship.dockTimer += dt;
                ship.speedFactor = Math.max(0, ship.speedFactor - dt * 2.2);
                ship.progress = Math.min(1, ship.dockTimer / stop.duration);
                ship.statusText = stop.statusText;
                ship.phaseLabel = stop.phaseLabel;

                const useNativeStream = (ship.facility.id !== 'lng-carrier' && ship.facility.id !== 'tanker-aniva');
                ship.transferGroup.visible = useNativeStream;
                const posArr = ship.transferLine.geometry.attributes.position.array;
                posArr[0] = ship.group.position.x;
                posArr[1] = ship.group.position.y + 0.55;
                posArr[2] = ship.group.position.z;
                posArr[3] = stop.targetPos.x;
                posArr[4] = stop.targetPos.y;
                posArr[5] = stop.targetPos.z;
                ship.transferLine.geometry.attributes.position.needsUpdate = true;

                for (let p = 0; p < ship.transferPulses.length; p++) {
                    const u = (elapsed * 0.75 + p / ship.transferPulses.length) % 1.0;
                    ship.transferPulses[p].position.set(
                        posArr[0] + (posArr[3] - posArr[0]) * u,
                        posArr[1] + (posArr[4] - posArr[1]) * u + Math.sin(u * Math.PI) * 0.25,
                        posArr[2] + (posArr[5] - posArr[2]) * u
                    );
                }

                if (ship.dockTimer >= stop.duration) {
                    ship.state = 'cruising';
                    ship.dockTimer = 0;
                    ship.progress = 0;
                    ship.transferGroup.visible = false;
                    ship.nextStopIndex = (ship.nextStopIndex + 1) % ship.stops.length;
                    ship.t = (ship.t + 0.0025) % 1.0;
                }
            } else {
                ship.transferGroup.visible = false;
                let targetSpeed = 1.0;
                if (stop) {
                    const distToStop = (stop.t - ship.t + 1.0) % 1.0;
                    if (distToStop < 0.045) {
                        targetSpeed = Math.max(0.22, distToStop / 0.045);
                        ship.statusText = `Подход • ${Math.max(3, Math.round((ship.facility.cruiseKnots || 14) * ship.speedFactor))} узл.`;
                        ship.phaseLabel = 'Подход';
                    } else {
                        ship.statusText = `В рейсе • ${ship.facility.cruiseKnots || 14} узл.`;
                        ship.phaseLabel = 'Рейс';
                    }
                }

                ship.speedFactor += (targetSpeed - ship.speedFactor) * Math.min(1, dt * 2.5);
                const stepT = dt * ship.speed * ship.speedFactor;
                const prevT = ship.t;
                ship.t = (ship.t + stepT) % 1.0;

                if (stop && ((stop.t - prevT + 1.0) % 1.0) <= stepT + 0.0012) {
                    ship.t = stop.t;
                    ship.state = 'docked';
                    ship.dockTimer = 0;
                    playShipHornSound();
                }

                ship.curve.getPointAt(ship.t, _tmpShipPos);
                ship.curve.getTangentAt(ship.t, _tmpShipTangent);
                ship.group.position.copy(_tmpShipPos);
                _tmpShipLook.copy(_tmpShipPos).add(_tmpShipTangent);
                ship.group.lookAt(_tmpShipLook);
            }

            ship.group.position.y = 0.06 + Math.sin(elapsed * 2.2 + ship.t * 20) * 0.025;
            ship.facility.position.copy(ship.group.position);
            applyShipCycleFade(ship, false);

            if (activeFacilityId === ship.facility.id) {
                updateShipStatusCard(ship);
                if (!cameraTransition.active) {
                    const dx = ship.group.position.x - prevX;
                    const dz = ship.group.position.z - prevZ;
                    if (Math.hypot(dx, dz) > 6.0) {
                        const camOffX = camera.position.x - controls.target.x;
                        const camOffY = camera.position.y - controls.target.y;
                        const camOffZ = camera.position.z - controls.target.z;
                        const newTarget = ship.group.position.clone();
                        const newPos = new THREE.Vector3(newTarget.x + camOffX, newTarget.y + camOffY, newTarget.z + camOffZ);
                        startCameraFly(newPos, newTarget, { duration: 1.15, arcHeight: 10, smoothMode: true });
                    } else {
                        _tmpShipDelta.set(dx, 0, dz);
                        camera.position.add(_tmpShipDelta);
                        controls.target.add(_tmpShipDelta);
                    }
                }
            }
        }

        if (isFlowEnabled) {
            for (let i = 0; i < pipelineFlowParticles.length; i++) {
                const p = pipelineFlowParticles[i];
                p.t = (p.t + dt * p.speed * productionRate) % 1.0;
                p.curve.getPointAt(p.t, p.mesh.position);
            }
        }
    }

    if (sakhalin1Built && isFarEastProject()) {
        for (let i = 0; i < s1Flares.length; i++) {
            const f = s1Flares[i];
            const rateBoost = 0.6 + productionRate * 0.45;
            const s = (0.88 + Math.sin(elapsed * 14 + f.phase) * 0.18) * rateBoost;
            f.flame.scale.set(0.85 + productionRate * 0.18, s, 0.85 + productionRate * 0.18);
            f.glow.scale.setScalar((0.9 + Math.cos(elapsed * 11 + f.phase) * 0.16) * rateBoost);
        }
        for (let i = 0; i < s1Beacons.length; i++) {
            s1Beacons[i].mesh.visible = Math.sin(elapsed * 4.5 + s1Beacons[i].phase) > 0.0;
        }
        if (isFlowEnabled) {
            for (let i = 0; i < s1PipelineFlowParticles.length; i++) {
                const p = s1PipelineFlowParticles[i];
                p.t = (p.t + dt * p.speed * productionRate) % 1.0;
                p.curve.getPointAt(p.t, p.mesh.position);
            }
        }
        for (let i = 0; i < s1MovingShips.length; i++) {
            const ship = s1MovingShips[i];
            const prevX = ship.group.position.x;
            const prevZ = ship.group.position.z;
            const stop = ship.stops.length > 0 ? ship.stops[ship.nextStopIndex] : null;

            if (ship.state === 'docked' && stop) {
                ship.dockTimer += dt;
                ship.speedFactor = Math.max(0, ship.speedFactor - dt * 2.2);
                ship.progress = Math.min(1, ship.dockTimer / stop.duration);
                ship.statusText = stop.statusText;
                ship.phaseLabel = stop.phaseLabel;

                // Для газовоза СПГ и танкера ТОН точные 3D-шланги рисует s2Runtime (прямо от жёлтых стендеров и башни ВПУ)
                const useCustomRuntimeHose = (ship.facility.id === 'lng-carrier' || ship.facility.id === 'tanker-aniva');
                ship.transferGroup.visible = !useCustomRuntimeHose;
                if (!useCustomRuntimeHose) {
                    const posArr = ship.transferLine.geometry.attributes.position.array;
                    posArr[0] = ship.group.position.x;
                    posArr[1] = ship.group.position.y + 0.55;
                    posArr[2] = ship.group.position.z;
                    posArr[3] = stop.targetPos.x;
                    posArr[4] = stop.targetPos.y;
                    posArr[5] = stop.targetPos.z;
                    ship.transferLine.geometry.attributes.position.needsUpdate = true;

                    for (let p = 0; p < ship.transferPulses.length; p++) {
                        const u = (elapsed * 0.75 + p / ship.transferPulses.length) % 1.0;
                        ship.transferPulses[p].position.set(
                            posArr[0] + (posArr[3] - posArr[0]) * u,
                            posArr[1] + (posArr[4] - posArr[1]) * u + Math.sin(u * Math.PI) * 0.25,
                            posArr[2] + (posArr[5] - posArr[2]) * u
                        );
                    }
                }
                if (ship.dockTimer >= stop.duration) {
                    ship.state = 'cruising';
                    ship.dockTimer = 0;
                    ship.progress = 0;
                    ship.transferGroup.visible = false;
                    ship.nextStopIndex = (ship.nextStopIndex + 1) % ship.stops.length;
                    ship.t = (ship.t + 0.0025) % 1.0;
                }
            } else {
                ship.transferGroup.visible = false;
                let targetSpeed = 1.0;
                if (stop) {
                    const distToStop = (stop.t - ship.t + 1.0) % 1.0;
                    if (distToStop < 0.045) {
                        targetSpeed = Math.max(0.22, distToStop / 0.045);
                        ship.statusText = `Подход • ${Math.max(3, Math.round((ship.facility.cruiseKnots || 14) * ship.speedFactor))} узл.`;
                        ship.phaseLabel = 'Подход';
                    } else {
                        ship.statusText = `В рейсе • ${ship.facility.cruiseKnots || 14} узл.`;
                        ship.phaseLabel = 'Рейс';
                    }
                }
                ship.speedFactor += (targetSpeed - ship.speedFactor) * Math.min(1, dt * 2.5);
                const stepT = dt * ship.speed * ship.speedFactor;
                const prevT = ship.t;
                ship.t = (ship.t + stepT) % 1.0;
                if (stop && ((stop.t - prevT + 1.0) % 1.0) <= stepT + 0.0012) {
                    ship.t = stop.t;
                    ship.state = 'docked';
                    ship.dockTimer = 0;
                    playShipHornSound();
                }
                ship.curve.getPointAt(ship.t, _tmpShipPos);
                ship.curve.getTangentAt(ship.t, _tmpShipTangent);
                ship.group.position.copy(_tmpShipPos);
                _tmpShipLook.copy(_tmpShipPos).add(_tmpShipTangent);
                ship.group.lookAt(_tmpShipLook);
            }

            ship.group.position.y = 0.06 + Math.sin(elapsed * 2.2 + ship.t * 20) * 0.025;
            ship.facility.position.copy(ship.group.position);
            applyShipCycleFade(ship, true);
            if (activeFacilityId === ship.facility.id) {
                updateShipStatusCard(ship);
                if (!cameraTransition.active) {
                    const dx = ship.group.position.x - prevX;
                    const dz = ship.group.position.z - prevZ;
                    if (Math.hypot(dx, dz) > 6.0) {
                        const camOffX = camera.position.x - controls.target.x;
                        const camOffY = camera.position.y - controls.target.y;
                        const camOffZ = camera.position.z - controls.target.z;
                        const newTarget = ship.group.position.clone();
                        const newPos = new THREE.Vector3(newTarget.x + camOffX, newTarget.y + camOffY, newTarget.z + camOffZ);
                        startCameraFly(newPos, newTarget, { duration: 1.15, arcHeight: 10, smoothMode: true });
                    } else {
                        _tmpShipDelta.set(dx, 0, dz);
                        camera.position.add(_tmpShipDelta);
                        controls.target.add(_tmpShipDelta);
                    }
                }
            }
        }
    }

    if (cameraTransition.active) {
        cameraTransition.progress += dt / cameraTransition.duration;
        const t = Math.min(1, cameraTransition.progress);
        const ease = cameraTransition.smoothMode
            ? (t * t * t * (t * (t * 6 - 15) + 10))
            : (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

        if (activeFacilityId) {
            const activeFac = getActiveFacilitiesList().find(f => f.id === activeFacilityId);
            if (activeFac && activeFac.isMovingShip && activeFac.position) {
                const distMult = isMobileViewport() ? 1.18 : 1.0;
                cameraTransition.endTarget.copy(activeFac.position);
                cameraTransition.endPos.set(
                    activeFac.position.x + 10.5 * distMult,
                    activeFac.position.y + 8.5 * distMult,
                    activeFac.position.z + 10.5 * distMult
                );
            }
        }

        camera.position.lerpVectors(cameraTransition.startPos, cameraTransition.endPos, ease);
        if (cameraTransition.arcHeight) {
            camera.position.y += Math.sin(Math.PI * ease) * cameraTransition.arcHeight;
        }
        controls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.endTarget, ease);

        if (t >= 1) {
            cameraTransition.active = false;
            cameraTransition.arcHeight = 0;
            cameraTransition.smoothMode = false;
            cameraTransition.duration = 1.15;
        }
    }

    updateWorldClouds(dt, elapsed);
    updateProjectCrossfade(dt);
    updateGoldMasterPolish(dt, elapsed);
    updateSakhalin2Runtime(dt, elapsed);
    updateSoundDesignV25(dt, elapsed);
    if (sakhalin1Built) updateFarEastAlive(dt, elapsed);
    if (sakhalin1Built && isFarEastProject()) {
        updateSakhalin1SeaIce(dt, elapsed);
    }
    updateTaigaLod();
    clampSakhalin1CameraTarget();
    if (camera && Math.abs(camera.fov - 42) > 0.04) {
        camera.fov += (42 - camera.fov) * Math.min(1, dt * 3.8);
        if (Math.abs(camera.fov - 42) <= 0.05) camera.fov = 42;
        camera.updateProjectionMatrix();
    }
    controls.update();

    if (compassNeedleEl) {
        const az = Math.atan2(
            camera.position.x - controls.target.x,
            camera.position.z - controls.target.z
        );
        const deg = Math.round(az * 180 / Math.PI);
        if (deg !== lastCompassDeg) {
            compassNeedleEl.style.transform = `rotate(${deg}deg)`;
            lastCompassDeg = deg;
        }
    }

    window._mobileDomTick = (window._mobileDomTick || 0) + 1;
    if (!isMobileViewport() || (window._mobileDomTick % 2 === 0)) {
        updateMarkersPosition();
    }
    renderer.render(scene, camera);
}

// Плавное появление судов у Сахалина и плавное растворение в море (без разворотов по кругу)
function applyShipCycleFade(ship, isS1Ship) {
    if (!ship || !ship.group) return;
    let fade = 1.0;
    if (ship.state !== 'docked') {
        if (ship.t < 0.08) {
            const u = Math.max(0, ship.t / 0.08);
            fade = u * u * (3 - 2 * u);
        } else if (ship.t > 0.84) {
            const u = Math.max(0, (1.0 - ship.t) / 0.16);
            fade = u * u * (3 - 2 * u);
        }
    }
    ship.fadeAlpha = fade;

    if (!ship._fadeMats) {
        const list = [];
        const seen = new Set();
        ship.group.traverse(obj => {
            if (!obj.material) return;
            // Кольцо выбора и невидимый хитбокс не трогаем
            if (obj.material.visible === false || (obj.geometry && obj.geometry.type === 'RingGeometry')) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (let i = 0; i < mats.length; i++) {
                const m = mats[i];
                if (!m || seen.has(m)) continue;
                seen.add(m);
                list.push({
                    mat: m,
                    origTransparent: Boolean(m.transparent),
                    origOpacity: m.opacity !== undefined ? m.opacity : 1.0
                });
            }
        });
        ship._fadeMats = list;
    }

    const isFading = fade < 0.995;
    for (let i = 0; i < ship._fadeMats.length; i++) {
        const e = ship._fadeMats[i];
        if (e.mat === ship.group.userData.wakeMat) continue;
        const wantTrans = isFading ? true : e.origTransparent;
        if (e.mat.transparent !== wantTrans) {
            e.mat.transparent = wantTrans;
            e.mat.needsUpdate = true;
        }
        e.mat.opacity = isFading ? (e.origOpacity * fade) : e.origOpacity;
    }

    if (ship.group.userData.wakeMat) {
        ship.group.userData.wakeMat.opacity = 0.36 * ship.speedFactor * fade;
    }

    const domMap = isS1Ship ? s1MarkerDomMap : markerDomMap;
    const domEntry = domMap ? domMap.get(ship.facility.id) : null;
    if (domEntry && domEntry.el) {
        domEntry.shipFade = fade;
    }
}



