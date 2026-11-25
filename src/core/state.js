'use strict';

/*!
 * Интерактивная 3D-карта нефтегазовых проектов Сахалина и Дальнего Востока
 * Автор: Александр Чмулев (ПТК СахГУ)
 * © 2026 Александр Чмулев. Все права защищены (All Rights Reserved).
 */
window.PROJECT_AUTHOR = Object.freeze({
    name: 'Александр Чмулев',
    university: 'Политехнический колледж СахГУ (ПТК СахГУ)',
    rights: '© 2026 Александр Чмулев. All Rights Reserved.'
});

// [BLOCK:CORE_STATE]
// =========================================================================
// 1. ДИАГНОСТИКА ОШИБОК И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ СЦЕНЫ
// =========================================================================
function showRuntimeError(err) {
    const banner = document.getElementById('error-banner');
    const msgEl = document.getElementById('error-banner-msg');
    if (banner && msgEl) {
        msgEl.textContent = (err && err.message) ? err.message : String(err);
        banner.classList.remove('hidden');
    }
    console.error('Sakhalin 3D Map Error:', err);
}

window.addEventListener('error', e => {
    if (e && e.error) showRuntimeError(e.error);
});
window.addEventListener('unhandledrejection', e => {
    if (e && e.reason) showRuntimeError(e.reason);
});

// Совместимая с Three.js r128 замена CapsuleGeometry
function createCapsuleGeometry(radius, length, radialSegments = 8) {
    const geo = new THREE.SphereGeometry(radius, radialSegments, 8);
    const scaleY = (length + radius * 2) / (radius * 2);
    geo.scale(1, scaleY, 1);
    return geo;
}

function escapeAttr(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

let platformModePreference = 'auto';
let isGlobeIntroActive = true;
let introStartProject = 'sakhalin2';

try {
    const savedPlatform = localStorage.getItem('sakhalin_platform_mode');
    if (savedPlatform === 'mobile' || savedPlatform === 'desktop' || savedPlatform === 'auto') {
        platformModePreference = savedPlatform;
    }
} catch (_) {}

function detectAutoMobile() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    return window.innerWidth < 768 || (coarse && window.innerWidth < 960);
}

function isMobileViewport() {
    if (platformModePreference === 'mobile') return true;
    if (platformModePreference === 'desktop') return false;
    return window.innerWidth < 768;
}

function applyPlatformMode(mode, silent) {
    if (mode === 'mobile' || mode === 'desktop' || mode === 'auto') {
        platformModePreference = mode;
        try { localStorage.setItem('sakhalin_platform_mode', mode); } catch (_) {}
    }
    document.body.classList.remove('force-mobile', 'force-desktop');
    if (platformModePreference === 'mobile') {
        document.body.classList.add('force-mobile');
    } else if (platformModePreference === 'desktop') {
        document.body.classList.add('force-desktop');
    }

    // Оптимизация плотности пикселей для телефона vs ПК
    if (renderer) {
        const maxDpr = isMobileViewport() ? 1.5 : 2.0;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
        renderer.setSize(viewportWidth, viewportHeight);
    }

    // Обновляем подсветку кнопок в стартовом глобусе
    document.querySelectorAll('.globe-mode-btn').forEach(btn => {
        const active = btn.dataset.platform === platformModePreference;
        btn.classList.toggle('active-mode', active);
        btn.classList.toggle('text-slate-300', !active);
    });
    const enMode = (typeof isEn === 'function' && isEn());
    const detEl = document.getElementById('globe-platform-detected');
    if (detEl) {
        if (platformModePreference === 'auto') {
            detEl.textContent = detectAutoMobile()
                ? (enMode ? 'Auto (Mobile)' : 'Авто (Телефон)')
                : (enMode ? 'Auto (Desktop)' : 'Авто (ПК)');
        } else {
            detEl.textContent = platformModePreference === 'mobile'
                ? (enMode ? 'Mode: Mobile' : 'Режим: Телефон')
                : (enMode ? 'Mode: Desktop' : 'Режим: ПК');
        }
    }
    if (typeof syncDeviceCameraLimits === 'function') {
        syncDeviceCameraLimits();
    }
    if (!isGlobeIntroActive && !isReturningToGlobe && typeof setWorldCloudsAperture === 'function' && worldClouds && worldClouds.built && worldClouds.curClosed < 0.2) {
        setWorldCloudsAperture((activeProject === 'sakhalin1' || activeProject === 'shv') ? 'sakhalin1' : 'sakhalin2', { duration: 0.9 });
    }
    if (!silent && typeof showToast === 'function') {
        showToast(isMobileViewport()
            ? (enMode ? 'Layout: Mobile' : 'Режим интерфейса: Телефон')
            : (enMode ? 'Layout: Desktop' : 'Режим интерфейса: ПК'));
    }
}
let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;

// Единая географическая проекция острова Сахалин [lon, lat] -> [x, z]
const CENTER_LON = 142.85;
const CENTER_LAT = 50.35;
const LAT_SCALE = 25.8;
const LON_SCALE = LAT_SCALE * Math.cos(CENTER_LAT * Math.PI / 180);

function lonLatToXZ(lon, lat) {
    return [
        (lon - CENTER_LON) * LON_SCALE,
        -(lat - CENTER_LAT) * LAT_SCALE
    ];
}

function lonLatToVec3(lon, lat, y = 0.08) {
    const [x, z] = lonLatToXZ(lon, lat);
    return new THREE.Vector3(x, y, z);
}

// Глобальное состояние Three.js и интерфейса
let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let raycaster = null;
let mouse = null;
let waterUniforms = null;
let surfUniforms = null;
let clock = null;

let hemiLight = null;
let dirLight = null;
let fillLight = null;
let waterMesh = null;
let subseaGroup = null;
let subseaSeabedMesh = null;
let subseaS2Group = null;
let subseaPulseNodes = [];
let nauticalGridGroup = null;
let gridDomList = [];
let natureLandmarksGroup = null;
let natureDomList = [];
let islandMesh = null;
let islandSummerColors = null;
let islandWinterColors = null;
let taigaMesh = null;
let seaIceMesh = null;
let seaIceFloes = [];
let _iceDummy = null;
let cityLightsGroup = null;
let cityLightsMat = null;
let supplyHelicopter = null;
let moneronWinterMats = [];
const _moneronSnowColor = new THREE.Color(0xe6f1fa);

let clickableObjects = [];
let facilityModelsMap = new Map();
let markerDomMap = new Map();
let cityDomList = [];
let pipelineSegments = [];
let pipelineFlowParticles = [];
let pipelineExclusionPts = [];
let flareFlames = [];
let lighthouseBeams = [];
let lighthouseBeamMats = [];
let movingShips = [];
let platformDetailLods = [];
let platformBeacons = [];
let platformRadars = [];

let activeFacilityId = null;
let activeProject = 'sakhalin2';
function isFarEastProject(proj) {
    const p = proj !== undefined ? proj : activeProject;
    return p === 'sakhalin1' || p === 'sakhalin3' || p === 'shv';
}
let sakhalin2Group = null;
let sakhalin1Built = false;
let sakhalin1Group = null;
let s1SubseaGroup = null;
let s1MainlandMesh = null;
let s1SummerColors = null;
let s1WinterColors = null;
let s1BackdropGroup = null;
let s1BackdropMat = null;
let s1BackdropBorderMat = null;
let s1CityLightsGroup = null;
let s1CityLightsMat = null;
let s1NeighborsGroup = null;
let s1NeighborsMat = null;
let s1KurilsMat = null;
let s1ChinaBorderMat = null;
let s1CloudMesh = null;
let s1CloudMat = null;
let s1CloudFloorMat = null;
let s1SeaIceMesh = null;
let s1SeaIceFloes = [];
let s1TaigaMesh = null;
let taigaPoints = null;
let s1TaigaPoints = null;
let nightGlowTex = null;
let s2NightHalosGroup = null;
let s2NightHalosMat = null;
let s1NightHalosGroup = null;
let s1NightHalosMat = null;
let s1NeighborLightsGroup = null;
let s1NeighborLightsMat = null;
let s1NauticalGridGroup = null;
let s1GridDomList = [];
let s1CloudItems = [];
let _s1CloudDummy = null;
let s1ClickableObjects = [];
let s1FacilityModelsMap = new Map();
let s1MarkerDomMap = new Map();
let s1CityDomList = [];
let s1PipelineSegments = [];
let s1PipelineFlowParticles = [];
let s1MovingShips = [];
let s1Beacons = [];
let s1Flares = [];
let farEastOutline = [];
let farEastAABB = { minX: -335, maxX: 35, minZ: -250, maxZ: 220 };
const FAR_EAST_BUCKET_COUNT = 64;
let farEastZBuckets = [];

let currentFilter = 'all';
let currentSearchQuery = '';
let isFlowEnabled = true;
let areLabelsVisible = true;
let isNightMode = false;
let nightMix = 0;
let isWinterMode = false;
let winterMix = 0;
let isSubseaMode = false;
let isGridVisible = false;
let isNatureVisible = true;
let isSoundEnabled = true;
let productionRate = 1.0;

let audioEngine = {
    ctx: null,
    masterGain: null,
    isRunning: false
};
let isMobileDetailCollapsed = false;

let compassNeedleEl = null;
let lastCompassDeg = null;

let DEFAULT_CAMERA_POS = null;
let DEFAULT_CAMERA_TARGET = null;
let TOP_DOWN_CAMERA_POS = null;
let TOP_DOWN_CAMERA_TARGET = null;

let _projVec = null;
let _tmpShipPos = null;
let _tmpShipTangent = null;
let _tmpShipLook = null;
let _tmpShipDelta = null;
let _tmpHeliPos = null;
let _tmpHeliTan = null;
let _tmpHeliLook = null;

let _dayBgColor = null;
let _nightBgColor = null;
let _daySunColor = null;
let _nightMoonColor = null;
let _summerTaigaTint = null;
let _winterTaigaTint = null;

let cameraTransition = {
    active: false,
    progress: 0,
    duration: 1.15,
    startPos: null,
    endPos: null,
    startTarget: null,
    endTarget: null
};

// Распределение объектов ДВ по раздельным проектным вкладкам (Сахалин-1, Сахалин-3, МГП СХВ)
const PROJECT_FACILITY_IDS = {
    sakhalin1: ['s1-odoptu', 's1-berkut', 's1-orlan', 's1-chayvo', 's1-dekastri', 's1-tanker-dekastri'],
    sakhalin3: ['s3-pdk', 's3-south-kirinskoye', 's3-btk'],
    shv: ['s3-gks', 's3-nevelskoy', 's3-ks-north', 's1-komsomolsk', 's1-khabarovsk', 's3-ks-mainland', 's3-ks-south', 's1-vladivostok', 's3-grs-russky']
};

// Какие ветки трубопроводов показываются на каждой вкладке (строгая изоляция проектов!)
// Связующая ветка Чайво -> ГКС (s1-gas-chayvo-gks) скрыта в изолированном режиме СХВ, чтобы не обрываться в лесу без Чайво
const PROJECT_DEFAULT_PIPES = {
    sakhalin1: ['s1-shelf', 's1-oil-dekastri'],
    sakhalin3: ['s3-subsea'],
    shv: ['s1-gas-far-east', 's1-gas-west']
};

// Цепочки автотура для каждой вкладки
const TOUR_STOP_IDS = [
    'pa-b', 'pa-a', 'lun-a', 'obtk', 'nks-2',
    'uoug-south', 'lng-plant', 'aniva-lighthouse', 'tanker-aniva'
];
const SAKHALIN1_TOUR_STOP_IDS = [
    's1-odoptu', 's1-berkut', 's1-orlan', 's1-chayvo', 's1-dekastri', 's1-tanker-dekastri'
];
const SAKHALIN3_TOUR_STOP_IDS = [
    's3-pdk', 's3-south-kirinskoye', 's3-btk'
];
const SHV_TOUR_STOP_IDS = [
    's3-gks', 's3-nevelskoy', 's3-ks-north', 's1-komsomolsk', 's1-khabarovsk', 's3-ks-mainland', 's3-ks-south', 's1-vladivostok', 's3-grs-russky'
];
let tourState = {
    active: false,
    index: 0,
    timer: 0,
    stepDuration: 6.2
};

// Соответствие объектов технологическим веткам трубопроводов и судам
const FACILITY_CHAIN_MAP = {
    'pa-b': { pipes: ['oil-north', 'gas-north', 'oil-trunk', 'oil-ton'], ships: ['tanker-aniva', 'supply-vessel'] },
    'pa-a': { pipes: ['oil-north', 'gas-north', 'oil-trunk', 'oil-ton'], ships: ['tanker-aniva', 'supply-vessel'] },
    'uoug-north': { pipes: ['gas-north', 'gas-trunk', 'gas-lng'], ships: [] },
    'lun-a': { pipes: ['gas-lun', 'gas-trunk', 'gas-lng'], ships: ['lng-carrier', 'supply-vessel'] },
    'obtk': { pipes: ['oil-north', 'gas-north', 'gas-lun', 'oil-trunk', 'gas-trunk'], ships: [] },
    'nks-2': { pipes: ['oil-trunk', 'gas-trunk', 'oil-ton', 'gas-lng'], ships: [] },
    'uoug-south': { pipes: ['gas-trunk', 'gas-lng'], ships: [] },
    'lng-plant': { pipes: ['gas-lun', 'gas-trunk', 'gas-lng', 'oil-north', 'oil-trunk', 'oil-ton'], ships: ['lng-carrier', 'tanker-aniva'] },
    'tanker-aniva': { pipes: ['oil-north', 'oil-trunk', 'oil-ton'], ships: ['tanker-aniva'] },
    'lng-carrier': { pipes: ['gas-lun', 'gas-trunk', 'gas-lng'], ships: ['lng-carrier'] },
    'supply-vessel': { pipes: ['oil-north', 'gas-north', 'gas-lun'], ships: ['supply-vessel'] }
};

const SAKHALIN1_CHAIN_MAP = {
    's1-odoptu': { pipes: ['s1-shelf', 's1-oil-dekastri'], ships: ['s1-tanker-dekastri'] },
    's1-berkut': { pipes: ['s1-shelf', 's1-oil-dekastri'], ships: ['s1-tanker-dekastri'] },
    's1-orlan': { pipes: ['s1-shelf', 's1-oil-dekastri'], ships: ['s1-tanker-dekastri'] },
    's1-chayvo': { pipes: ['s1-shelf', 's1-oil-dekastri'], ships: ['s1-tanker-dekastri'] },
    's1-dekastri': { pipes: ['s1-shelf', 's1-oil-dekastri'], ships: ['s1-tanker-dekastri'] },
    's1-tanker-dekastri': { pipes: ['s1-oil-dekastri'], ships: ['s1-tanker-dekastri'] },
    's1-komsomolsk': { pipes: ['s1-gas-chayvo-gks', 's1-gas-far-east', 's1-gas-west'], ships: [] },
    's1-khabarovsk': { pipes: ['s1-gas-far-east', 's1-gas-west'], ships: [] },
    's1-vladivostok': { pipes: ['s1-gas-far-east'], ships: [] },
    's3-pdk': { pipes: ['s3-subsea', 's3-gas-btk-gks'], ships: [] },
    's3-south-kirinskoye': { pipes: ['s3-subsea'], ships: [] },
    's3-btk': { pipes: ['s3-subsea', 's3-gas-btk-gks'], ships: [] },
    's3-gks': { pipes: ['s3-subsea', 's3-gas-btk-gks', 's1-gas-chayvo-gks', 's1-gas-far-east'], ships: [] },
    's3-nevelskoy': { pipes: ['s1-gas-chayvo-gks', 's1-gas-far-east'], ships: [] },
    's3-ks-north': { pipes: ['s1-gas-far-east'], ships: [] },
    's3-ks-mainland': { pipes: ['s1-gas-far-east', 's1-gas-west'], ships: [] },
    's3-ks-south': { pipes: ['s1-gas-far-east'], ships: [] },
    's3-grs-russky': { pipes: ['s1-gas-far-east'], ships: [] }
};

