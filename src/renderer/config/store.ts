import { defineStore } from 'pinia';
import type {
  OverlayState,
  DisplayInfo,
  PomodoroState,
  HudLayout,
  GlitchConfig,
  AttentionMode,
  FocusTrigger,
  PerformanceProfile,
} from '../shared/types';
import { THEMES, getDefaultGlitchThemeId, createDefaultGlitchConfig, PRESETS, type PresetValues } from '../shared/types';

// Non-reactive sync bookkeeping kept at module scope.
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
// While the user is actively editing, hold the local values and ignore the main
// process's periodic broadcasts for a short window — otherwise a broadcast
// carrying the pre-change state lands mid-round-trip and reverts the control the
// user just touched.
let suppressStateUntil = 0;

function cloneLayout(l: HudLayout): HudLayout {
  return {
    clock: { ...l.clock },
    statsHud: { ...l.statsHud },
    pomodoro: { ...l.pomodoro },
    status: { ...l.status },
    sysTag: { ...l.sysTag },
    signalLog: { ...l.signalLog },
    sessionTime: { ...l.sessionTime },
  };
}

export const useOverlayStore = defineStore('overlay', {
  // All settings fields here mirror the *currently selected display's* effective
  // state; `selectedDisplayId` says which display edits target.
  state: () => ({
    effectsEnabled: true, // global master toggle
    selectedDisplayId: null as number | null,
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
    focusSpotlight: false,
    focusDimStrength: 0.5,
    focusTrigger: 'typing' as FocusTrigger,
    cinemaMode: true,
    showSignalLog: true,
    showSessionTime: false,
    glitchFrequency: 0.02,
    glitchConfig: createDefaultGlitchConfig() as GlitchConfig,
    layout: {
      clock: { side: 'bottom', offset: 1 },
      statsHud: { side: 'bottom', offset: 0 },
      pomodoro: { side: 'top', offset: 1 },
      status: { side: 'top', offset: 0 },
      sysTag: { side: 'top', offset: 1 },
      signalLog: { side: 'right', offset: 0.12 },
      sessionTime: { side: 'top', offset: 0.5 },
    } as HudLayout,
    displays: [] as DisplayInfo[],
    colorThemeId: 'cyber',
    glitchThemeId: getDefaultGlitchThemeId(),
    pomodoro: { active: false, phase: 'work', totalSeconds: 25 * 60, remainingSeconds: 25 * 60 } as PomodoroState,
    pomodoroWorkMinutes: 25,
    pomodoroBreakMinutes: 5,
    launchAtLogin: false,
    performanceProfile: 'balanced' as PerformanceProfile,
    activePresetId: '',
    attentionEnabled: true,
    attentionMode: 'auto' as AttentionMode,
    attentionSensitivity: 0.5,
    attentionNotifyOnComplete: true,
    lifetimeTasksDone: 0,
  }),
  actions: {
    /** Push current settings to the main process (debounced), targeting the
     * selected display — or every display when `applyToAll`. */
    sync(applyToAll = false) {
      suppressStateUntil = Date.now() + 500;
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        window.cyberAPI?.setConfig({
          effectsEnabled: this.effectsEnabled,
          intensity: this.intensity,
          showScanlines: this.showScanlines,
          showGlitches: this.showGlitches,
          showCursorTrail: this.showCursorTrail,
          showTargetHighlight: this.showTargetHighlight,
          showClock: this.showClock,
          showStatsHud: this.showStatsHud,
          showPomodoro: this.showPomodoro,
          showAudioViz: this.showAudioViz,
          showStatus: this.showStatus,
          showSysTag: this.showSysTag,
          showVignette: this.showVignette,
          showEdgeGlow: this.showEdgeGlow,
          showActivityBar: this.showActivityBar,
          showColorFlash: this.showColorFlash,
          showNotificationFlash: this.showNotificationFlash,
          systemLoadGlow: this.systemLoadGlow,
          showFocusRing: this.showFocusRing,
          breakReminders: this.breakReminders,
          presenceDimming: this.presenceDimming,
          showTaskComplete: this.showTaskComplete,
          showNotificationRadar: this.showNotificationRadar,
          focusSpotlight: this.focusSpotlight,
          focusDimStrength: this.focusDimStrength,
          focusTrigger: this.focusTrigger,
          cinemaMode: this.cinemaMode,
          showSignalLog: this.showSignalLog,
          showSessionTime: this.showSessionTime,
          glitchFrequency: this.glitchFrequency,
          glitchConfig: JSON.parse(JSON.stringify(this.glitchConfig)),
          layout: cloneLayout(this.layout),
          displays: this.displays.map((d) => ({ id: d.id, enabled: d.enabled })),
          colorTheme: THEMES.find((t) => t.id === this.colorThemeId) || THEMES[0],
          glitchTheme: this.glitchThemeId,
          pomodoroWorkMinutes: this.pomodoroWorkMinutes,
          pomodoroBreakMinutes: this.pomodoroBreakMinutes,
          launchAtLogin: this.launchAtLogin,
          performanceProfile: this.performanceProfile,
          attention: {
            enabled: this.attentionEnabled,
            mode: this.attentionMode,
            sensitivity: this.attentionSensitivity,
            notifyOnComplete: this.attentionNotifyOnComplete,
          },
          targetDisplayId: this.selectedDisplayId ?? undefined,
          applyToAll,
        });
      }, 50);
    },

    /** Merge an incoming state broadcast (for the selected display) from main. */
    hydrate(s: OverlayState) {
      if (!s) return;
      this.pomodoro = s.pomodoro || this.pomodoro;
      this.displays = s.displays || [];
      this.lifetimeTasksDone = s.lifetimeTasksDone ?? this.lifetimeTasksDone;
      if (this.selectedDisplayId == null && this.displays.length) {
        this.selectedDisplayId = this.displays[0].id;
      }
      // Don't clobber fields the user is actively editing. External changes
      // (tray, hotkeys) still land once the suppression window elapses.
      if (Date.now() < suppressStateUntil) return;
      this.effectsEnabled = s.effectsEnabled;
      this.intensity = s.intensity;
      this.showScanlines = s.showScanlines;
      this.showGlitches = s.showGlitches;
      this.showCursorTrail = s.showCursorTrail;
      this.showTargetHighlight = s.showTargetHighlight;
      this.showClock = s.showClock;
      this.showStatsHud = s.showStatsHud;
      this.showPomodoro = s.showPomodoro;
      this.showAudioViz = s.showAudioViz ?? true;
      this.showStatus = s.showStatus ?? true;
      this.showSysTag = s.showSysTag ?? true;
      this.showVignette = s.showVignette ?? true;
      this.showEdgeGlow = s.showEdgeGlow ?? true;
      this.showActivityBar = s.showActivityBar ?? true;
      this.showColorFlash = s.showColorFlash ?? true;
      this.showNotificationFlash = s.showNotificationFlash ?? true;
      this.systemLoadGlow = s.systemLoadGlow ?? true;
      this.showFocusRing = s.showFocusRing ?? true;
      this.breakReminders = s.breakReminders ?? true;
      this.presenceDimming = s.presenceDimming ?? true;
      this.showTaskComplete = s.showTaskComplete ?? true;
      this.showNotificationRadar = s.showNotificationRadar ?? true;
      this.focusSpotlight = s.focusSpotlight ?? false;
      this.focusDimStrength = s.focusDimStrength ?? 0.5;
      this.focusTrigger = s.focusTrigger ?? 'typing';
      this.cinemaMode = s.cinemaMode ?? true;
      this.showSignalLog = s.showSignalLog ?? true;
      this.showSessionTime = s.showSessionTime ?? false;
      this.glitchFrequency = s.glitchFrequency;
      if (s.glitchConfig) this.glitchConfig = JSON.parse(JSON.stringify(s.glitchConfig));
      if (s.layout) this.layout = cloneLayout(s.layout);
      this.colorThemeId = s.colorTheme?.id || 'cyber';
      this.glitchThemeId = s.glitchTheme || getDefaultGlitchThemeId();
      this.pomodoroWorkMinutes = s.pomodoroWorkMinutes ?? 25;
      this.pomodoroBreakMinutes = s.pomodoroBreakMinutes ?? 5;
      this.launchAtLogin = s.launchAtLogin ?? false;
      this.performanceProfile = s.performanceProfile ?? 'balanced';
      this.attentionEnabled = s.attention?.enabled ?? true;
      this.attentionMode = s.attention?.mode ?? 'auto';
      this.attentionSensitivity = s.attention?.sensitivity ?? 0.5;
      this.attentionNotifyOnComplete = s.attention?.notifyOnComplete ?? true;
    },

    toggleMaster() {
      this.effectsEnabled = !this.effectsEnabled;
      this.sync();
    },

    setColorTheme(colorThemeId: string) {
      this.colorThemeId = colorThemeId;
      this.sync();
    },

    setGlitchTheme(glitchThemeId: string) {
      this.glitchThemeId = glitchThemeId;
      this.sync();
    },

    /** Update one sub-effect knob of the active glitch theme. */
    setGlitchParam(themeId: string, key: string, patch: { enabled?: boolean; intensity?: number }) {
      const theme = this.glitchConfig[themeId];
      if (!theme || !theme[key]) return;
      if (patch.enabled !== undefined) theme[key].enabled = patch.enabled;
      if (patch.intensity !== undefined) theme[key].intensity = patch.intensity;
      this.sync();
    },

    /** Switch which display the panel edits, and pull its settings from main. */
    selectDisplay(displayId: number) {
      this.selectedDisplayId = displayId;
      suppressStateUntil = 0; // let the incoming display state land immediately
      window.cyberAPI?.selectDisplay(displayId);
    },

    /** Copy the current settings to every display at once. */
    applyToAllDisplays() {
      this.sync(true);
    },

    /** One-click starting point: write a preset's values into the store and
     * push them to every display at once. */
    applyPreset(id: string) {
      const preset = PRESETS.find((p) => p.id === id);
      if (!preset) return;
      this.activePresetId = id;
      const v = preset.values as PresetValues;
      if (v.intensity !== undefined) this.intensity = v.intensity;
      if (v.glitchFrequency !== undefined) this.glitchFrequency = v.glitchFrequency;
      if (v.colorThemeId !== undefined) this.colorThemeId = v.colorThemeId;
      if (v.glitchThemeId !== undefined) this.glitchThemeId = v.glitchThemeId;
      if (v.showScanlines !== undefined) this.showScanlines = v.showScanlines;
      if (v.showGlitches !== undefined) this.showGlitches = v.showGlitches;
      if (v.showCursorTrail !== undefined) this.showCursorTrail = v.showCursorTrail;
      if (v.showTargetHighlight !== undefined) this.showTargetHighlight = v.showTargetHighlight;
      if (v.showClock !== undefined) this.showClock = v.showClock;
      if (v.showStatsHud !== undefined) this.showStatsHud = v.showStatsHud;
      if (v.showPomodoro !== undefined) this.showPomodoro = v.showPomodoro;
      if (v.showAudioViz !== undefined) this.showAudioViz = v.showAudioViz;
      if (v.showStatus !== undefined) this.showStatus = v.showStatus;
      if (v.showSysTag !== undefined) this.showSysTag = v.showSysTag;
      if (v.showVignette !== undefined) this.showVignette = v.showVignette;
      if (v.showEdgeGlow !== undefined) this.showEdgeGlow = v.showEdgeGlow;
      if (v.showActivityBar !== undefined) this.showActivityBar = v.showActivityBar;
      if (v.showColorFlash !== undefined) this.showColorFlash = v.showColorFlash;
      if (v.showNotificationFlash !== undefined) this.showNotificationFlash = v.showNotificationFlash;
      if (v.systemLoadGlow !== undefined) this.systemLoadGlow = v.systemLoadGlow;
      if (v.showFocusRing !== undefined) this.showFocusRing = v.showFocusRing;
      if (v.breakReminders !== undefined) this.breakReminders = v.breakReminders;
      if (v.presenceDimming !== undefined) this.presenceDimming = v.presenceDimming;
      if (v.showTaskComplete !== undefined) this.showTaskComplete = v.showTaskComplete;
      if (v.showNotificationRadar !== undefined) this.showNotificationRadar = v.showNotificationRadar;
      if (v.focusSpotlight !== undefined) this.focusSpotlight = v.focusSpotlight;
      if (v.focusDimStrength !== undefined) this.focusDimStrength = v.focusDimStrength;
      if (v.focusTrigger !== undefined) this.focusTrigger = v.focusTrigger;
      if (v.cinemaMode !== undefined) this.cinemaMode = v.cinemaMode;
      if (v.showSignalLog !== undefined) this.showSignalLog = v.showSignalLog;
      if (v.showSessionTime !== undefined) this.showSessionTime = v.showSessionTime;
      if (v.layout) this.layout = cloneLayout(v.layout);
      this.sync(true);
    },

    setPomodoroWork(minutes: number) {
      this.pomodoroWorkMinutes = minutes;
      window.cyberAPI?.setPomodoroWork(minutes);
      this.sync();
    },

    setPomodoroBreak(minutes: number) {
      this.pomodoroBreakMinutes = minutes;
      window.cyberAPI?.setPomodoroBreak(minutes);
      this.sync();
    },

    toggleDisplay(displayId: number) {
      const display = this.displays.find((d) => d.id === displayId);
      if (display) {
        display.enabled = !display.enabled;
        this.sync();
      }
    },

    /** Subscribe to main-process broadcasts and request initial state. */
    init() {
      window.cyberAPI?.onStateUpdate((s) => this.hydrate(s));
      window.cyberAPI?.getState();
    },
  },
});
