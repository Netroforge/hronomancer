import type { OverlayState, DisplayInfo, PomodoroState, HudLayout, GlitchConfig, AttentionMode, FocusTrigger } from '../shared/types';
export declare const useOverlayStore: import("pinia").StoreDefinition<"overlay", {
    effectsEnabled: boolean;
    selectedDisplayId: number | null;
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
    displays: DisplayInfo[];
    colorThemeId: string;
    glitchThemeId: string;
    pomodoro: PomodoroState;
    attentionEnabled: boolean;
    attentionMode: AttentionMode;
    attentionSensitivity: number;
    attentionNotifyOnComplete: boolean;
    lifetimeTasksDone: number;
}, {}, {
    /** Push current settings to the main process (debounced), targeting the
     * selected display — or every display when `applyToAll`. */
    sync(applyToAll?: boolean): void;
    /** Merge an incoming state broadcast (for the selected display) from main. */
    hydrate(s: OverlayState): void;
    toggleMaster(): void;
    setColorTheme(colorThemeId: string): void;
    setGlitchTheme(glitchThemeId: string): void;
    /** Update one sub-effect knob of the active glitch theme. */
    setGlitchParam(themeId: string, key: string, patch: {
        enabled?: boolean;
        intensity?: number;
    }): void;
    /** Switch which display the panel edits, and pull its settings from main. */
    selectDisplay(displayId: number): void;
    /** Copy the current settings to every display at once. */
    applyToAllDisplays(): void;
    toggleDisplay(displayId: number): void;
    /** Subscribe to main-process broadcasts and request initial state. */
    init(): void;
}>;
