'use strict';


let appStarted = false;
function startApp() {
    if (appStarted) return;
    appStarted = true;
    try {
        initScene();
        syncDeviceCameraLimits();
        initGoldMasterPolish();
        initSakhalin2Runtime();
        initSoundDesignV25();
        applyPermanentNaturalFilter();
        animate();
        initGlobeIntro();
    } catch (err) {
        showRuntimeError(err);
    }
}

if (document.readyState !== 'loading') {
    startApp();
} else {
    document.addEventListener('DOMContentLoaded', startApp);
}
window.addEventListener('load', startApp);
