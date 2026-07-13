export interface MouseState {
    x: number;
    y: number;
    vx: number;
    vy: number;
}
export interface DisplayInfo {
    id: number;
    label: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    enabled: boolean;
}
export interface ScreenAnalysis {
    brightness: number;
    dominantColor: [number, number, number];
    motion: number;
    regions: {
        topLeft: number;
        topRight: number;
        bottomLeft: number;
        bottomRight: number;
    };
}
export interface AudioAnalysis {
    bass: number;
    mid: number;
    treble: number;
    volume: number;
    waveform: number[];
}
export interface SystemStats {
    cpu: number;
    ram: number;
    ramTotal: number;
    uptime: number;
}
/**
 * Presence / work-rhythm signals, computed in the main process from input
 * idleness. Drives the calm-tech channels: dim the overlay when the user is
 * away, and nudge a 20-20-20 break after a long continuous work streak.
 */
export interface PresenceState {
    idleMs: number;
    active: boolean;
    continuousActiveMs: number;
    breakLevel: number;
}
export interface ThemePreset {
    id: string;
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        glow: string;
        bg: string;
    };
}
/**
 * Lightweight descriptor of a glitch style, decoupled from the colour
 * {@link ThemePreset}. The actual glitch behaviour lives in the renderer under
 * `overlay/effects/glitches/<id>.ts`; this metadata (id, display name, preview
 * swatches) is what the config UI and persistence layer need. `id` must match a
 * key in the renderer's glitch registry.
 */
export interface GlitchThemePreset {
    id: string;
    name: string;
    swatch: [string, string, string];
}
/** Per-sub-effect knob: on/off plus a 0..2 intensity multiplier. */
export interface GlitchParamValue {
    enabled: boolean;
    intensity: number;
}
/** Declares one tunable sub-effect of a glitch theme (for the config UI + defaults). */
export interface GlitchParamDef {
    key: string;
    label: string;
    enabled: boolean;
    intensity: number;
}
/** Granular glitch settings: glitchThemeId → sub-effect key → knob. */
export type GlitchConfig = Record<string, Record<string, GlitchParamValue>>;
export interface PomodoroState {
    active: boolean;
    phase: 'work' | 'break';
    totalSeconds: number;
    remainingSeconds: number;
}
/** Screen edge a HUD panel is anchored to. */
export type HudSide = 'top' | 'bottom' | 'left' | 'right';
/**
 * Placement of a HUD panel: which screen edge it hugs, and how far along that
 * edge it sits (0 = the start corner, 1 = the end corner). The offset lets a
 * panel be positioned anywhere between the two corners of its side rather than
 * only at the corners themselves.
 */
export interface HudPosition {
    side: HudSide;
    offset: number;
}
/** Legacy corner enum — still accepted when migrating old saved settings. */
export type HudCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
/** User-configurable placement of the positionable HUD panels. */
export interface HudLayout {
    clock: HudPosition;
    statsHud: HudPosition;
    pomodoro: HudPosition;
    status: HudPosition;
    sysTag: HudPosition;
    signalLog: HudPosition;
    sessionTime: HudPosition;
}
/** Every positionable HUD widget key, for iterating layout uniformly. */
export declare const HUD_LAYOUT_KEYS: readonly ["clock", "statsHud", "pomodoro", "status", "sysTag", "signalLog", "sessionTime"];
export type HudLayoutKey = (typeof HUD_LAYOUT_KEYS)[number];
export declare const HUD_SIDES: HudSide[];
/**
 * Coerce an arbitrary persisted/IPC value into a valid {@link HudPosition}.
 * Accepts a new `{ side, offset }` object, migrates a legacy corner string, and
 * otherwise returns a copy of `fallback`. Offsets are clamped to 0..1.
 */
export declare function normalizeHudPosition(value: unknown, fallback: HudPosition): HudPosition;
export interface OverlayState {
    effectsEnabled: boolean;
    intensity: number;
    showScanlines: boolean;
    showGlitches: boolean;
    showCursorTrail: boolean;
    showTargetHighlight: boolean;
    showClock: boolean;
    showStatsHud: boolean;
    showPomodoro: boolean;
    showAudioViz: boolean;
    showStatus: boolean;
    showSysTag: boolean;
    showVignette: boolean;
    showEdgeGlow: boolean;
    showActivityBar: boolean;
    showColorFlash: boolean;
    showNotificationFlash: boolean;
    systemLoadGlow: boolean;
    showFocusRing: boolean;
    breakReminders: boolean;
    presenceDimming: boolean;
    showTaskComplete: boolean;
    showNotificationRadar: boolean;
    focusSpotlight: boolean;
    focusDimStrength: number;
    focusTrigger: FocusTrigger;
    cinemaMode: boolean;
    showSignalLog: boolean;
    showSessionTime: boolean;
    glitchFrequency: number;
    glitchConfig: GlitchConfig;
    layout: HudLayout;
    mouse: MouseState;
    prevMouse: MouseState;
    activityLevel: number;
    lastActivity: number;
    keystrokes: Keystroke[];
    mouseVel: MouseState;
    screen: ScreenAnalysis;
    audio: AudioAnalysis;
    system: SystemStats;
    displays: DisplayInfo[];
    colorTheme: ThemePreset;
    glitchTheme: string;
    pomodoro: PomodoroState;
    bootComplete: boolean;
    notificationFlash: number;
    presence: PresenceState;
    attention: AttentionAnalysis;
    lifetimeTasksDone: number;
}
export interface Keystroke {
    key: number;
    time: number;
}
export interface InputMouseData {
    x: number;
    y: number;
    vx: number;
    vy: number;
}
export interface InputKeyData {
    keycode: number;
}
export interface InputClickData {
    x: number;
    y: number;
    button: number;
}
export interface DisplayInfoMessage {
    displayId: number;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
/**
 * Config payload sent to the main process. The per-display settings fields plus
 * global bits, targeted at one display (`targetDisplayId`) or all of them
 * (`applyToAll`).
 */
export type SetConfigPayload = Omit<Partial<OverlayState>, 'displays' | 'attention'> & {
    displays?: {
        id: number;
        enabled: boolean;
    }[];
    attention?: {
        enabled: boolean;
        mode: AttentionMode;
        sensitivity: number;
        notifyOnComplete: boolean;
    };
    targetDisplayId?: number;
    applyToAll?: boolean;
};
/** The bridge exposed on `window.cyberAPI` by the preload script. */
export interface CyberAPI {
    onStateUpdate: (cb: (state: OverlayState) => void) => void;
    onMouseInput: (cb: (data: InputMouseData) => void) => void;
    onKeyInput: (cb: (data: InputKeyData) => void) => void;
    onClickInput: (cb: (data: InputClickData) => void) => void;
    onDisplayInfo: (cb: (data: DisplayInfoMessage) => void) => void;
    getState: () => void;
    setConfig: (config: SetConfigPayload) => void;
    selectDisplay: (displayId: number) => void;
    closeWindow: () => void;
    windowMove: (offsetX: number, offsetY: number) => void;
    startPomodoro: () => void;
    setPomodoroWork: (minutes: number) => void;
    openExternal: (url: string) => void;
}
export interface TrailPoint {
    x: number;
    y: number;
    life: number;
    size: number;
}
export type AttentionMode = 'auto' | 'notification' | 'motion' | 'contrast' | 'color';
/** When the focus spotlight engages: only during sustained typing, or whenever
 * you're present and recently active (reading/mousing counts too). */
export type FocusTrigger = 'typing' | 'active';
/** One entry in the Signal Log — a screen-assist event worth remembering after
 * its transient on-canvas cue has faded. `away` marks events that happened while
 * the user was detected as away (powers the "while you were away" recap). */
export interface SignalEvent {
    id: number;
    type: 'complete' | 'notification' | 'alert';
    label: string;
    time: number;
    away: boolean;
}
/** What a detected region is understood to be — drives colour, label and which
 * "help" effect (if any) reacts to it. */
export type AttentionType = 'notification' | 'alert' | 'video' | 'text' | 'motion' | 'complete';
/** Lifecycle of a tracked region, used by the task-done detector. */
export type RegionActivity = 'new' | 'churning' | 'steady' | 'settled';
/**
 * A region of the screen the analyser thinks is worth attention. Coordinates are
 * NORMALISED (0..1) in screen space so the renderer can map them onto any overlay
 * resolution by multiplying by its own width/height — the capture thumbnail's
 * pixel size is irrelevant downstream. Only plain serialisable fields live here
 * (this is structured-cloned to every overlay); the analyser keeps its per-region
 * motion history module-locally in the main process.
 */
export interface AttentionRegion {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    score: number;
    type: AttentionType;
    label: string;
    activity: RegionActivity;
    peakMotion: number;
    born: number;
    lastSeen: number;
    settledAt: number;
    dismissed: boolean;
}
export interface AttentionAnalysis {
    enabled: boolean;
    mode: AttentionMode;
    sensitivity: number;
    notifyOnComplete: boolean;
    gridCols: number;
    gridRows: number;
    regions: AttentionRegion[];
    prevFrame: Uint8Array | null;
    frameWidth: number;
    frameHeight: number;
}
export declare const THEMES: ThemePreset[];
export declare function getDefaultTheme(): ThemePreset;
/**
 * Available glitch styles. Names/swatches are intentionally glitch-flavoured (and
 * distinct from the colour theme names) to make clear this is a separate axis:
 * you pick a colour theme and a glitch style independently. Each `id` maps to an
 * implementation in `overlay/effects/glitches/`.
 */
export declare const GLITCH_THEMES: GlitchThemePreset[];
export declare function getDefaultGlitchThemeId(): string;
/** Whether `id` names a known glitch style. */
export declare function isGlitchThemeId(id: unknown): id is string;
/**
 * The tunable sub-effects of each glitch theme. The keys here MUST match the
 * `on(c, key)` / `amt(c, key)` checks in the corresponding
 * `overlay/effects/glitches/<id>.ts` spawn function. This is the single source
 * of truth for both the config UI and the default {@link GlitchConfig}.
 */
export declare const GLITCH_PARAMS: Record<string, GlitchParamDef[]>;
/** Build a fresh {@link GlitchConfig} from the parameter defaults. */
export declare function createDefaultGlitchConfig(): GlitchConfig;
/**
 * Merge a (possibly partial / persisted) glitch config onto the current
 * defaults, so newly-added sub-effects appear and unknown keys are dropped.
 */
export declare function normalizeGlitchConfig(value: unknown): GlitchConfig;
export declare const DISPLAY_SETTING_KEYS: readonly ["intensity", "showScanlines", "showGlitches", "showCursorTrail", "showTargetHighlight", "showClock", "showStatsHud", "showPomodoro", "showAudioViz", "showStatus", "showSysTag", "showVignette", "showEdgeGlow", "showActivityBar", "showColorFlash", "showNotificationFlash", "systemLoadGlow", "showFocusRing", "breakReminders", "presenceDimming", "showTaskComplete", "showNotificationRadar", "focusSpotlight", "focusDimStrength", "focusTrigger", "cinemaMode", "showSignalLog", "showSessionTime", "glitchFrequency", "layout", "colorTheme", "glitchTheme", "glitchConfig"];
export type DisplaySettingKey = (typeof DISPLAY_SETTING_KEYS)[number];
export type DisplaySettings = Pick<OverlayState, DisplaySettingKey>;
/** Deep-clone a settings object (plain data only) so displays don't share refs. */
export declare function cloneDisplaySettings(ds: DisplaySettings): DisplaySettings;
/** Pull the per-display-configurable subset out of a full state (deep-cloned). */
export declare function extractDisplaySettings(s: OverlayState): DisplaySettings;
export declare function createDefaultState(): OverlayState;
