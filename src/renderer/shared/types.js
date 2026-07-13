/** Every positionable HUD widget key, for iterating layout uniformly. */
export const HUD_LAYOUT_KEYS = ['clock', 'statsHud', 'pomodoro', 'status', 'sysTag', 'signalLog', 'sessionTime'];
export const HUD_SIDES = ['top', 'bottom', 'left', 'right'];
const CORNER_TO_POSITION = {
    'top-left': { side: 'top', offset: 0 },
    'top-right': { side: 'top', offset: 1 },
    'bottom-left': { side: 'bottom', offset: 0 },
    'bottom-right': { side: 'bottom', offset: 1 },
};
/**
 * Coerce an arbitrary persisted/IPC value into a valid {@link HudPosition}.
 * Accepts a new `{ side, offset }` object, migrates a legacy corner string, and
 * otherwise returns a copy of `fallback`. Offsets are clamped to 0..1.
 */
export function normalizeHudPosition(value, fallback) {
    if (typeof value === 'string' && value in CORNER_TO_POSITION) {
        return { ...CORNER_TO_POSITION[value] };
    }
    if (value && typeof value === 'object') {
        const v = value;
        if (typeof v.side === 'string' &&
            HUD_SIDES.includes(v.side) &&
            typeof v.offset === 'number' &&
            Number.isFinite(v.offset)) {
            return { side: v.side, offset: Math.min(1, Math.max(0, v.offset)) };
        }
    }
    return { ...fallback };
}
export const THEMES = [
    {
        id: 'cyber',
        name: 'CYBER DEFAULT',
        colors: { primary: '#05d9e8', secondary: '#ff2a6d', accent: '#00ff41', glow: '#05d9e8', bg: '#0a0a0a' },
    },
    {
        id: 'matrix',
        name: 'MATRIX',
        colors: { primary: '#00ff41', secondary: '#008f11', accent: '#00ff41', glow: '#00ff41', bg: '#000a00' },
    },
    {
        id: 'synthwave',
        name: 'SYNTHWAVE',
        colors: { primary: '#ff6ec7', secondary: '#7b2ff7', accent: '#ffdd00', glow: '#ff6ec7', bg: '#1a0025' },
    },
    {
        id: 'tron',
        name: 'TRON',
        colors: { primary: '#00d4ff', secondary: '#0066ff', accent: '#ffffff', glow: '#00d4ff', bg: '#000a14' },
    },
    {
        id: 'cyberpunk2077',
        name: 'CYBERPUNK 2077',
        colors: { primary: '#fcee09', secondary: '#ff003c', accent: '#00f0ff', glow: '#fcee09', bg: '#0a0a00' },
    },
    {
        id: 'ghost',
        name: 'GHOST IN THE SHELL',
        colors: { primary: '#ffffff', secondary: '#888888', accent: '#ff4444', glow: '#ffffff', bg: '#0a0a0a' },
    },
    {
        id: 'terminator',
        name: 'TERMINATOR',
        colors: { primary: '#ff0000', secondary: '#880000', accent: '#ff4444', glow: '#ff0000', bg: '#0a0000' },
    },
    {
        id: 'evangelion',
        name: 'EVANGELION',
        colors: { primary: '#ff00ff', secondary: '#00ff00', accent: '#ff6600', glow: '#ff00ff', bg: '#0a000a' },
    },
];
export function getDefaultTheme() {
    return THEMES[0];
}
/**
 * Available glitch styles. Names/swatches are intentionally glitch-flavoured (and
 * distinct from the colour theme names) to make clear this is a separate axis:
 * you pick a colour theme and a glitch style independently. Each `id` maps to an
 * implementation in `overlay/effects/glitches/`.
 */
export const GLITCH_THEMES = [
    { id: 'cyber', name: 'NEON GLITCH', swatch: ['#05d9e8', '#ff2a6d', '#00ff41'] },
    { id: 'matrix', name: 'DIGITAL RAIN', swatch: ['#00ff41', '#c8ffd0', '#0a8f2a'] },
    { id: 'synthwave', name: 'VHS / ANALOG', swatch: ['#ff6ec7', '#7b2ff7', '#00e5ff'] },
    { id: 'tron', name: 'GRID / WIRE', swatch: ['#00d4ff', '#ffffff', '#ff9900'] },
    { id: 'cyberpunk2077', name: 'BREACH', swatch: ['#fcee09', '#ff003c', '#00f0ff'] },
    { id: 'ghost', name: 'THERMOPTIC', swatch: ['#e8f4ff', '#7dffb0', '#888888'] },
    { id: 'terminator', name: 'IR HUD', swatch: ['#ff0000', '#ff4444', '#aa0000'] },
    { id: 'evangelion', name: 'NERV ALERT', swatch: ['#ff2a2a', '#ff6600', '#00ff66'] },
];
export function getDefaultGlitchThemeId() {
    return GLITCH_THEMES[0].id;
}
/** Whether `id` names a known glitch style. */
export function isGlitchThemeId(id) {
    return typeof id === 'string' && GLITCH_THEMES.some((g) => g.id === id);
}
/**
 * The tunable sub-effects of each glitch theme. The keys here MUST match the
 * `on(c, key)` / `amt(c, key)` checks in the corresponding
 * `overlay/effects/glitches/<id>.ts` spawn function. This is the single source
 * of truth for both the config UI and the default {@link GlitchConfig}.
 */
export const GLITCH_PARAMS = {
    cyber: [
        { key: 'bars', label: 'Displaced Bars', enabled: true, intensity: 1 },
        { key: 'rgbSplit', label: 'RGB Split', enabled: true, intensity: 1 },
        { key: 'hexCode', label: 'Hex Code (type)', enabled: true, intensity: 1 },
        { key: 'sliceTear', label: 'Screen Tear (motion)', enabled: true, intensity: 1 },
    ],
    matrix: [
        { key: 'rain', label: 'Digital Rain', enabled: true, intensity: 1 },
        { key: 'cascade', label: 'Cascade (type/click)', enabled: true, intensity: 1 },
    ],
    synthwave: [
        { key: 'wave', label: 'Wave Distortion', enabled: true, intensity: 1 },
        { key: 'rgbSplit', label: 'Chromatic Aberration', enabled: true, intensity: 1 },
        { key: 'trackingBars', label: 'Tracking Bars', enabled: true, intensity: 1 },
        { key: 'osd', label: 'VHS OSD (type)', enabled: true, intensity: 1 },
        { key: 'sliceTear', label: 'Screen Tear (motion)', enabled: true, intensity: 1 },
    ],
    tron: [
        { key: 'wireframes', label: 'Wireframes', enabled: true, intensity: 1 },
        { key: 'derez', label: 'Derez Rings (click)', enabled: true, intensity: 1 },
        { key: 'gridLines', label: 'Grid Lines', enabled: true, intensity: 1 },
        { key: 'tags', label: 'I/O Tags (type)', enabled: true, intensity: 1 },
    ],
    cyberpunk2077: [
        { key: 'codeMatrix', label: 'Code Matrix', enabled: true, intensity: 1 },
        { key: 'rgbSplit', label: 'RGB Split', enabled: true, intensity: 1 },
        { key: 'labels', label: 'Breach Tags', enabled: true, intensity: 1 },
        { key: 'trackingBar', label: 'Tracking Bar', enabled: true, intensity: 1 },
        { key: 'sliceTear', label: 'Screen Tear (motion)', enabled: true, intensity: 1 },
    ],
    ghost: [
        { key: 'shimmer', label: 'Thermoptic Shimmer', enabled: true, intensity: 1 },
        { key: 'cipher', label: 'Pale Cipher', enabled: true, intensity: 1 },
        { key: 'staticNoise', label: 'Faint Static', enabled: true, intensity: 1 },
    ],
    terminator: [
        { key: 'reticle', label: 'Targeting Reticle', enabled: true, intensity: 1 },
        { key: 'codeDump', label: '6502 Code Dump', enabled: true, intensity: 1 },
        { key: 'hudBars', label: 'HUD Bars', enabled: true, intensity: 1 },
        { key: 'callouts', label: 'Analysis Call-outs', enabled: true, intensity: 1 },
    ],
    evangelion: [
        { key: 'hexWarnings', label: 'AT-Field Hexagons', enabled: true, intensity: 1 },
        { key: 'hazardBars', label: 'Hazard Bars', enabled: true, intensity: 1 },
        { key: 'warningLabels', label: '警告 Warnings', enabled: true, intensity: 1 },
    ],
};
/** Build a fresh {@link GlitchConfig} from the parameter defaults. */
export function createDefaultGlitchConfig() {
    const cfg = {};
    for (const themeId of Object.keys(GLITCH_PARAMS)) {
        cfg[themeId] = {};
        for (const p of GLITCH_PARAMS[themeId]) {
            cfg[themeId][p.key] = { enabled: p.enabled, intensity: p.intensity };
        }
    }
    return cfg;
}
/**
 * Merge a (possibly partial / persisted) glitch config onto the current
 * defaults, so newly-added sub-effects appear and unknown keys are dropped.
 */
export function normalizeGlitchConfig(value) {
    const base = createDefaultGlitchConfig();
    if (!value || typeof value !== 'object')
        return base;
    const v = value;
    for (const themeId of Object.keys(base)) {
        const incoming = v[themeId];
        if (!incoming)
            continue;
        for (const key of Object.keys(base[themeId])) {
            const iv = incoming[key];
            if (iv && typeof iv === 'object') {
                if (typeof iv.enabled === 'boolean')
                    base[themeId][key].enabled = iv.enabled;
                if (typeof iv.intensity === 'number') {
                    base[themeId][key].intensity = Math.min(2, Math.max(0, iv.intensity));
                }
            }
        }
    }
    return base;
}
// ─── Per-display settings ───────────────────────────────────────
// Every field a user can configure independently per monitor. Runtime data
// (input, system stats, screen/audio analysis, presence, pomodoro, attention)
// stays shared. The main process keeps one DisplaySettings per display and
// merges it with the shared runtime into the flat OverlayState each overlay
// window renders.
export const DISPLAY_SETTING_KEYS = [
    'intensity',
    'showScanlines',
    'showGlitches',
    'showCursorTrail',
    'showTargetHighlight',
    'showClock',
    'showStatsHud',
    'showPomodoro',
    'showAudioViz',
    'showStatus',
    'showSysTag',
    'showVignette',
    'showEdgeGlow',
    'showActivityBar',
    'showColorFlash',
    'showNotificationFlash',
    'systemLoadGlow',
    'showFocusRing',
    'breakReminders',
    'presenceDimming',
    'showTaskComplete',
    'showNotificationRadar',
    'focusSpotlight',
    'focusDimStrength',
    'focusTrigger',
    'cinemaMode',
    'showSignalLog',
    'showSessionTime',
    'glitchFrequency',
    'layout',
    'colorTheme',
    'glitchTheme',
    'glitchConfig',
];
/** Deep-clone a settings object (plain data only) so displays don't share refs. */
export function cloneDisplaySettings(ds) {
    return JSON.parse(JSON.stringify(ds));
}
/** Pull the per-display-configurable subset out of a full state (deep-cloned). */
export function extractDisplaySettings(s) {
    const out = {};
    for (const k of DISPLAY_SETTING_KEYS)
        out[k] = s[k];
    return cloneDisplaySettings(out);
}
export function createDefaultState() {
    return {
        effectsEnabled: true,
        intensity: 0.7,
        showScanlines: true,
        showGlitches: true,
        showCursorTrail: true,
        showTargetHighlight: true,
        showClock: true,
        showStatsHud: false,
        showPomodoro: false,
        showAudioViz: true,
        showStatus: true,
        showSysTag: true,
        showVignette: true,
        showEdgeGlow: true,
        showActivityBar: true,
        showColorFlash: true,
        showNotificationFlash: true,
        systemLoadGlow: true,
        showFocusRing: true,
        breakReminders: true,
        presenceDimming: true,
        showTaskComplete: true,
        showNotificationRadar: true,
        focusSpotlight: false, // opt-in: it dims real desktop content, so off by default
        focusDimStrength: 0.5, // 0..1 → scaled to the spotlight's peak periphery dim
        focusTrigger: 'typing',
        cinemaMode: true,
        showSignalLog: true,
        showSessionTime: false, // opt-in glanceable readout
        glitchFrequency: 0.02,
        glitchConfig: createDefaultGlitchConfig(),
        layout: {
            clock: { side: 'bottom', offset: 1 },
            statsHud: { side: 'bottom', offset: 0 },
            pomodoro: { side: 'top', offset: 1 },
            status: { side: 'top', offset: 0 },
            sysTag: { side: 'top', offset: 1 },
            signalLog: { side: 'right', offset: 0.12 },
            sessionTime: { side: 'top', offset: 0.5 },
        },
        mouse: { x: 0, y: 0, vx: 0, vy: 0 },
        prevMouse: { x: 0, y: 0, vx: 0, vy: 0 },
        activityLevel: 0,
        lastActivity: Date.now(),
        keystrokes: [],
        mouseVel: { x: 0, y: 0, vx: 0, vy: 0 },
        screen: {
            brightness: 0.5,
            dominantColor: [0, 0, 0],
            motion: 0,
            regions: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
        },
        audio: { bass: 0, mid: 0, treble: 0, volume: 0, waveform: [] },
        system: { cpu: 0, ram: 0, ramTotal: 0, uptime: 0 },
        displays: [],
        colorTheme: getDefaultTheme(),
        glitchTheme: getDefaultGlitchThemeId(),
        pomodoro: { active: false, phase: 'work', totalSeconds: 25 * 60, remainingSeconds: 25 * 60 },
        bootComplete: false,
        notificationFlash: 0,
        presence: { idleMs: 0, active: true, continuousActiveMs: 0, breakLevel: 0 },
        lifetimeTasksDone: 0,
        attention: {
            enabled: true,
            mode: 'auto',
            sensitivity: 0.5,
            notifyOnComplete: true,
            gridCols: 32,
            gridRows: 18,
            regions: [],
            prevFrame: null,
            frameWidth: 0,
            frameHeight: 0,
        },
    };
}
