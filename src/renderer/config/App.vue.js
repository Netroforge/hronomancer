import { onMounted, computed } from 'vue';
import { THEMES, GLITCH_THEMES, GLITCH_PARAMS } from '../shared/types';
import { useOverlayStore } from './store';
// Positionable HUD panels and the edges they can hug. Kept as data so the
// layout picker is a single v-for rather than repeated markup. The offset slider
// then slides a panel along its chosen side, between the two corners.
const LAYOUT_ELEMENTS = [
    { key: 'clock', label: 'Clock' },
    { key: 'statsHud', label: 'System Stats' },
    { key: 'pomodoro', label: 'Pomodoro' },
    { key: 'status', label: 'Status Readout' },
    { key: 'sysTag', label: 'System Tag' },
    { key: 'signalLog', label: 'Signal Log' },
    { key: 'sessionTime', label: 'Session Time' },
];
// Placeholder support link — swap for your real Ko-fi / Buy Me a Coffee handle.
const SUPPORT_URL = 'https://buymeacoffee.com/hronomancer';
const SIDES = [
    { key: 'top', label: 'TOP' },
    { key: 'bottom', label: 'BOT' },
    { key: 'left', label: 'LEFT' },
    { key: 'right', label: 'RIGHT' },
];
// Pinia store: holds the settings, owns the IPC sync + edit-suppression logic.
// The template binds to `config.*` directly (Pinia exposes state as instance
// properties), so markup is unchanged from the old local-ref version.
const config = useOverlayStore();
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
function sync() {
    config.sync();
}
function toggleMaster() {
    config.toggleMaster();
}
function closeWindow() {
    window.cyberAPI?.closeWindow();
}
function toggleDisplay(displayId) {
    config.toggleDisplay(displayId);
}
function setColorTheme(colorThemeId) {
    config.setColorTheme(colorThemeId);
}
function setGlitchTheme(glitchThemeId) {
    config.setGlitchTheme(glitchThemeId);
}
// ── Per-display editing ──
function selectDisplay(id) {
    config.selectDisplay(id);
}
function applyToAll() {
    config.applyToAllDisplays();
}
function displayTabLabel(d) {
    return `${d.bounds.width}×${d.bounds.height}`;
}
// ── Granular per-theme glitch config ──
const glitchParams = computed(() => GLITCH_PARAMS[config.glitchThemeId] ?? []);
function paramEnabled(key) {
    return config.glitchConfig[config.glitchThemeId]?.[key]?.enabled ?? true;
}
function paramIntensity(key) {
    return config.glitchConfig[config.glitchThemeId]?.[key]?.intensity ?? 1;
}
function toggleParam(key) {
    config.setGlitchParam(config.glitchThemeId, key, { enabled: !paramEnabled(key) });
}
function setParamIntensity(key, v) {
    config.setGlitchParam(config.glitchThemeId, key, { intensity: v });
}
function setSide(element, side) {
    config.layout[element].side = side;
    sync();
}
function setOffset(element, offset) {
    config.layout[element].offset = offset;
    sync();
}
function startPomodoro() {
    window.cyberAPI?.startPomodoro();
}
function openSupport() {
    window.cyberAPI?.openExternal(SUPPORT_URL);
}
function onTitlebarMouseDown(e) {
    isDragging = true;
    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
}
function onMouseMove(e) {
    if (!isDragging)
        return;
    const offsetX = e.screenX - lastMouseX;
    const offsetY = e.screenY - lastMouseY;
    lastMouseX = e.screenX;
    lastMouseY = e.screenY;
    window.cyberAPI?.windowMove(offsetX, offsetY);
}
function onMouseUp() {
    isDragging = false;
}
onMounted(() => {
    config.init();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMousemove: (__VLS_ctx.onMouseMove) },
    ...{ onMouseup: (__VLS_ctx.onMouseUp) },
    ...{ onMouseleave: (__VLS_ctx.onMouseUp) },
    ...{ class: "config-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onMousedown: (__VLS_ctx.onTitlebarMouseDown) },
    ...{ class: "titlebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.closeWindow) },
    ...{ class: "close-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.toggleMaster) },
    ...{ class: "master-toggle" },
    ...{ class: (__VLS_ctx.config.effectsEnabled ? 'on' : 'off') },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.config.effectsEnabled ? '[ SYSTEM: ACTIVE ]' : '[ SYSTEM: OFFLINE ]');
if (__VLS_ctx.config.displays.length > 1) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "section-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "display-tabs" },
    });
    for (const [d, i] of __VLS_getVForSourceType((__VLS_ctx.config.displays))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.config.displays.length > 1))
                        return;
                    __VLS_ctx.selectDisplay(d.id);
                } },
            key: (d.id),
            ...{ class: "display-tab" },
            ...{ class: ({ active: __VLS_ctx.config.selectedDisplayId === d.id }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "dt-num" },
        });
        (i + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "dt-res" },
        });
        (__VLS_ctx.displayTabLabel(d));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.applyToAll) },
        ...{ class: "apply-all-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "info-text" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "theme-grid" },
});
for (const [theme] of __VLS_getVForSourceType((__VLS_ctx.THEMES))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setColorTheme(theme.id);
            } },
        key: (theme.id),
        ...{ class: "theme-card" },
        ...{ class: ({ active: __VLS_ctx.config.colorThemeId === theme.id }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "theme-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tp" },
        ...{ style: ({ background: theme.colors.primary }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tp" },
        ...{ style: ({ background: theme.colors.secondary }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tp" },
        ...{ style: ({ background: theme.colors.accent }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "theme-name" },
    });
    (theme.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "theme-grid" },
});
for (const [glitch] of __VLS_getVForSourceType((__VLS_ctx.GLITCH_THEMES))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.setGlitchTheme(glitch.id);
            } },
        key: (glitch.id),
        ...{ class: "theme-card" },
        ...{ class: ({ active: __VLS_ctx.config.glitchThemeId === glitch.id }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "theme-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tp" },
        ...{ style: ({ background: glitch.swatch[0] }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tp" },
        ...{ style: ({ background: glitch.swatch[1] }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tp" },
        ...{ style: ({ background: glitch.swatch[2] }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "theme-name" },
    });
    (glitch.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glitch-params" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "glitch-params-title" },
});
(__VLS_ctx.GLITCH_THEMES.find(g => g.id === __VLS_ctx.config.glitchThemeId)?.name);
for (const [p] of __VLS_getVForSourceType((__VLS_ctx.glitchParams))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (p.key),
        ...{ class: "glitch-param" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "toggle-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (p.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleParam(p.key);
            } },
        ...{ class: "toggle" },
        ...{ class: ({ active: __VLS_ctx.paramEnabled(p.key) }) },
    });
    if (__VLS_ctx.paramEnabled(p.key)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "slider-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (__VLS_ctx.paramIntensity(p.key).toFixed(1));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.paramEnabled(p.key)))
                        return;
                    __VLS_ctx.setParamIntensity(p.key, parseFloat($event.target.value));
                } },
            type: "range",
            min: "0",
            max: "2",
            step: "0.1",
            value: (__VLS_ctx.paramIntensity(p.key)),
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag" },
    ...{ style: ({ background: __VLS_ctx.THEMES.find(t => t.id === __VLS_ctx.config.colorThemeId)?.colors.primary }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showScanlines = !__VLS_ctx.config.showScanlines;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showScanlines }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag" },
    ...{ style: ({ background: __VLS_ctx.THEMES.find(t => t.id === __VLS_ctx.config.colorThemeId)?.colors.secondary }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showGlitches = !__VLS_ctx.config.showGlitches;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showGlitches }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag" },
    ...{ style: ({ background: __VLS_ctx.THEMES.find(t => t.id === __VLS_ctx.config.colorThemeId)?.colors.accent }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showCursorTrail = !__VLS_ctx.config.showCursorTrail;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showCursorTrail }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag pink" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showTargetHighlight = !__VLS_ctx.config.showTargetHighlight;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showTargetHighlight }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showClock = !__VLS_ctx.config.showClock;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showClock }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag green" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showStatsHud = !__VLS_ctx.config.showStatsHud;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showStatsHud }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag purple" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showPomodoro = !__VLS_ctx.config.showPomodoro;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showPomodoro }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showAudioViz = !__VLS_ctx.config.showAudioViz;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showAudioViz }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showStatus = !__VLS_ctx.config.showStatus;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showStatus }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag pink" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showSysTag = !__VLS_ctx.config.showSysTag;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showSysTag }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showEdgeGlow = !__VLS_ctx.config.showEdgeGlow;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showEdgeGlow }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag purple" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showVignette = !__VLS_ctx.config.showVignette;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showVignette }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag green" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showActivityBar = !__VLS_ctx.config.showActivityBar;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showActivityBar }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag yellow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showColorFlash = !__VLS_ctx.config.showColorFlash;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showColorFlash }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag pink" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showNotificationFlash = !__VLS_ctx.config.showNotificationFlash;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showNotificationFlash }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag green" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.systemLoadGlow = !__VLS_ctx.config.systemLoadGlow;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.systemLoadGlow }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showFocusRing = !__VLS_ctx.config.showFocusRing;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showFocusRing }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag yellow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.breakReminders = !__VLS_ctx.config.breakReminders;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.breakReminders }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showSessionTime = !__VLS_ctx.config.showSessionTime;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showSessionTime }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag purple" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.presenceDimming = !__VLS_ctx.config.presenceDimming;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.presenceDimming }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
for (const [el] of __VLS_getVForSourceType((__VLS_ctx.LAYOUT_ELEMENTS))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (el.key),
        ...{ class: "layout-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "layout-head" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (el.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "side-grid" },
    });
    for (const [side] of __VLS_getVForSourceType((__VLS_ctx.SIDES))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.setSide(el.key, side.key);
                } },
            key: (side.key),
            ...{ class: "side-btn" },
            ...{ class: ({ active: __VLS_ctx.config.layout[el.key].side === side.key }) },
        });
        (side.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slider-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    (__VLS_ctx.config.layout[el.key].side);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "value" },
    });
    (Math.round(__VLS_ctx.config.layout[el.key].offset * 100));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ onInput: (...[$event]) => {
                __VLS_ctx.setOffset(el.key, parseFloat($event.target.value));
            } },
        type: "range",
        min: "0",
        max: "1",
        step: "0.1",
        value: (__VLS_ctx.config.layout[el.key].offset),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "slider-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "value" },
});
((__VLS_ctx.config.intensity * 100).toFixed(0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.config.intensity = parseFloat($event.target.value);
            __VLS_ctx.sync();
        } },
    type: "range",
    min: "0",
    max: "1",
    step: "0.05",
    value: (__VLS_ctx.config.intensity),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "slider-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "value" },
});
((__VLS_ctx.config.glitchFrequency * 100).toFixed(1));
__VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
    ...{ onInput: (...[$event]) => {
            __VLS_ctx.config.glitchFrequency = parseFloat($event.target.value);
            __VLS_ctx.sync();
        } },
    type: "range",
    min: "0.005",
    max: "0.1",
    step: "0.005",
    value: (__VLS_ctx.config.glitchFrequency),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
if (__VLS_ctx.config.pomodoro.active) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pomodoro-status" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pomodoro-phase" },
    });
    (__VLS_ctx.config.pomodoro.phase === 'work' ? 'WORK' : 'BREAK');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "pomodoro-time" },
    });
    (Math.floor(__VLS_ctx.config.pomodoro.remainingSeconds / 60));
    (String(__VLS_ctx.config.pomodoro.remainingSeconds % 60).padStart(2, '0'));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startPomodoro) },
        ...{ class: "pomodoro-btn" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startPomodoro) },
        ...{ class: "pomodoro-btn start" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag pink" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.attentionEnabled = !__VLS_ctx.config.attentionEnabled;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.attentionEnabled }) },
});
if (__VLS_ctx.config.attentionEnabled) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slider-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "value" },
    });
    ((__VLS_ctx.config.attentionSensitivity * 100).toFixed(0));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.config.attentionEnabled))
                    return;
                __VLS_ctx.config.attentionSensitivity = parseFloat($event.target.value);
                __VLS_ctx.sync();
            } },
        type: "range",
        min: "0.1",
        max: "1",
        step: "0.05",
        value: (__VLS_ctx.config.attentionSensitivity),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mode-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.config.attentionEnabled))
                    return;
                __VLS_ctx.config.attentionMode = 'auto';
                __VLS_ctx.sync();
            } },
        ...{ class: "mode-btn" },
        ...{ class: ({ active: __VLS_ctx.config.attentionMode === 'auto' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.config.attentionEnabled))
                    return;
                __VLS_ctx.config.attentionMode = 'notification';
                __VLS_ctx.sync();
            } },
        ...{ class: "mode-btn" },
        ...{ class: ({ active: __VLS_ctx.config.attentionMode === 'notification' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.config.attentionEnabled))
                    return;
                __VLS_ctx.config.attentionMode = 'motion';
                __VLS_ctx.sync();
            } },
        ...{ class: "mode-btn" },
        ...{ class: ({ active: __VLS_ctx.config.attentionMode === 'motion' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.config.attentionEnabled))
                    return;
                __VLS_ctx.config.attentionMode = 'contrast';
                __VLS_ctx.sync();
            } },
        ...{ class: "mode-btn" },
        ...{ class: ({ active: __VLS_ctx.config.attentionMode === 'contrast' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.config.attentionEnabled))
                    return;
                __VLS_ctx.config.attentionMode = 'color';
                __VLS_ctx.sync();
            } },
        ...{ class: "mode-btn" },
        ...{ class: ({ active: __VLS_ctx.config.attentionMode === 'color' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "attention-info" },
    });
    if (__VLS_ctx.config.attentionMode === 'auto') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "info-text" },
        });
    }
    else if (__VLS_ctx.config.attentionMode === 'notification') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "info-text" },
        });
    }
    else if (__VLS_ctx.config.attentionMode === 'motion') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "info-text" },
        });
    }
    else if (__VLS_ctx.config.attentionMode === 'contrast') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "info-text" },
        });
    }
    else if (__VLS_ctx.config.attentionMode === 'color') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "info-text" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag green" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mic-note" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.attentionNotifyOnComplete = !__VLS_ctx.config.attentionNotifyOnComplete;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.attentionNotifyOnComplete }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag green" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showTaskComplete = !__VLS_ctx.config.showTaskComplete;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showTaskComplete }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showSignalLog = !__VLS_ctx.config.showSignalLog;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showSignalLog }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag pink" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.showNotificationRadar = !__VLS_ctx.config.showNotificationRadar;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.showNotificationRadar }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag purple" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.focusSpotlight = !__VLS_ctx.config.focusSpotlight;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.focusSpotlight }) },
});
if (__VLS_ctx.config.focusSpotlight) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "slider-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "value" },
    });
    ((__VLS_ctx.config.focusDimStrength * 100).toFixed(0));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input, __VLS_intrinsicElements.input)({
        ...{ onInput: (...[$event]) => {
                if (!(__VLS_ctx.config.focusSpotlight))
                    return;
                __VLS_ctx.config.focusDimStrength = parseFloat($event.target.value);
                __VLS_ctx.sync();
            } },
        type: "range",
        min: "0",
        max: "1",
        step: "0.05",
        value: (__VLS_ctx.config.focusDimStrength),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mode-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.config.focusSpotlight))
                    return;
                __VLS_ctx.config.focusTrigger = 'typing';
                __VLS_ctx.sync();
            } },
        ...{ class: "mode-btn" },
        ...{ class: ({ active: __VLS_ctx.config.focusTrigger === 'typing' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.config.focusSpotlight))
                    return;
                __VLS_ctx.config.focusTrigger = 'active';
                __VLS_ctx.sync();
            } },
        ...{ class: "mode-btn" },
        ...{ class: ({ active: __VLS_ctx.config.focusTrigger === 'active' }) },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toggle-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "color-tag cyan" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.config.cinemaMode = !__VLS_ctx.config.cinemaMode;
            __VLS_ctx.sync();
        } },
    ...{ class: "toggle" },
    ...{ class: ({ active: __VLS_ctx.config.cinemaMode }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "info-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
if (__VLS_ctx.config.displays.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "no-displays" },
    });
}
for (const [display] of __VLS_getVForSourceType((__VLS_ctx.config.displays))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (display.id),
        ...{ class: "toggle-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "color-tag" },
        ...{ class: (display.enabled ? 'green' : 'pink') },
    });
    (display.id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "display-res" },
    });
    (display.bounds.width);
    (display.bounds.height);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleDisplay(display.id);
            } },
        ...{ class: "toggle" },
        ...{ class: ({ active: display.enabled }) },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "support-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "support-privacy" },
});
if (__VLS_ctx.config.lifetimeTasksDone > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "support-line" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.b, __VLS_intrinsicElements.b)({});
    (__VLS_ctx.config.lifetimeTasksDone);
    (__VLS_ctx.config.lifetimeTasksDone === 1 ? '' : 's');
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "support-line" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.openSupport) },
    ...{ class: "coffee-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hotkey-list" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hotkey-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.kbd, __VLS_intrinsicElements.kbd)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hotkey-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.kbd, __VLS_intrinsicElements.kbd)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hotkey-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.kbd, __VLS_intrinsicElements.kbd)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hotkey-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.kbd, __VLS_intrinsicElements.kbd)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hotkey-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.kbd, __VLS_intrinsicElements.kbd)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats" },
});
/** @type {__VLS_StyleScopedClasses['config-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['titlebar']} */ ;
/** @type {__VLS_StyleScopedClasses['close-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['content']} */ ;
/** @type {__VLS_StyleScopedClasses['master-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['display-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['display-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['dt-num']} */ ;
/** @type {__VLS_StyleScopedClasses['dt-res']} */ ;
/** @type {__VLS_StyleScopedClasses['apply-all-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-card']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['tp']} */ ;
/** @type {__VLS_StyleScopedClasses['tp']} */ ;
/** @type {__VLS_StyleScopedClasses['tp']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-name']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-card']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['tp']} */ ;
/** @type {__VLS_StyleScopedClasses['tp']} */ ;
/** @type {__VLS_StyleScopedClasses['tp']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-name']} */ ;
/** @type {__VLS_StyleScopedClasses['glitch-params']} */ ;
/** @type {__VLS_StyleScopedClasses['glitch-params-title']} */ ;
/** @type {__VLS_StyleScopedClasses['glitch-param']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['pink']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['green']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['purple']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['pink']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['purple']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['green']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['yellow']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['pink']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['green']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['yellow']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['purple']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['layout-item']} */ ;
/** @type {__VLS_StyleScopedClasses['layout-head']} */ ;
/** @type {__VLS_StyleScopedClasses['side-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['side-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['pomodoro-status']} */ ;
/** @type {__VLS_StyleScopedClasses['pomodoro-phase']} */ ;
/** @type {__VLS_StyleScopedClasses['pomodoro-time']} */ ;
/** @type {__VLS_StyleScopedClasses['pomodoro-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['pomodoro-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['start']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['pink']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['attention-info']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['green']} */ ;
/** @type {__VLS_StyleScopedClasses['mic-note']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['green']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['pink']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['purple']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['slider-row']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mode-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cyan']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['info-text']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['no-displays']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['display-res']} */ ;
/** @type {__VLS_StyleScopedClasses['toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['support-card']} */ ;
/** @type {__VLS_StyleScopedClasses['support-privacy']} */ ;
/** @type {__VLS_StyleScopedClasses['support-line']} */ ;
/** @type {__VLS_StyleScopedClasses['support-line']} */ ;
/** @type {__VLS_StyleScopedClasses['coffee-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['hotkey-list']} */ ;
/** @type {__VLS_StyleScopedClasses['hotkey-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hotkey-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hotkey-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hotkey-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hotkey-row']} */ ;
/** @type {__VLS_StyleScopedClasses['stats']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            THEMES: THEMES,
            GLITCH_THEMES: GLITCH_THEMES,
            LAYOUT_ELEMENTS: LAYOUT_ELEMENTS,
            SIDES: SIDES,
            config: config,
            sync: sync,
            toggleMaster: toggleMaster,
            closeWindow: closeWindow,
            toggleDisplay: toggleDisplay,
            setColorTheme: setColorTheme,
            setGlitchTheme: setGlitchTheme,
            selectDisplay: selectDisplay,
            applyToAll: applyToAll,
            displayTabLabel: displayTabLabel,
            glitchParams: glitchParams,
            paramEnabled: paramEnabled,
            paramIntensity: paramIntensity,
            toggleParam: toggleParam,
            setParamIntensity: setParamIntensity,
            setSide: setSide,
            setOffset: setOffset,
            startPomodoro: startPomodoro,
            openSupport: openSupport,
            onTitlebarMouseDown: onTitlebarMouseDown,
            onMouseMove: onMouseMove,
            onMouseUp: onMouseUp,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
