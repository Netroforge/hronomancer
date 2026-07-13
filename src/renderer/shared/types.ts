export interface MouseState {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface DisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
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
  idleMs: number; // time since the last mouse/keyboard input
  active: boolean; // false once idle passes the "away" threshold
  continuousActiveMs: number; // length of the current uninterrupted work streak
  breakLevel: number; // 0 = fine, 1 = break due (~20m), 2 = overdue (~30m)
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
  swatch: [string, string, string]; // preview colours for the picker
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
  enabled: boolean; // default
  intensity: number; // default (0..2)
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
  offset: number; // 0..1 along `side`
}

/** Legacy corner enum — still accepted when migrating old saved settings. */
export type HudCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** User-configurable placement of the positionable HUD panels. */
export interface HudLayout {
  clock: HudPosition;
  statsHud: HudPosition;
  pomodoro: HudPosition;
  status: HudPosition; // top-corner ACT/INT/POS readout
  sysTag: HudPosition; // top-corner SYS://NODE identity tag
  signalLog: HudPosition; // recent screen-assist events
  sessionTime: HudPosition; // unbroken-session elapsed readout
}

/** Every positionable HUD widget key, for iterating layout uniformly. */
export const HUD_LAYOUT_KEYS = ['clock', 'statsHud', 'pomodoro', 'status', 'sysTag', 'signalLog', 'sessionTime'] as const;
export type HudLayoutKey = (typeof HUD_LAYOUT_KEYS)[number];

export const HUD_SIDES: HudSide[] = ['top', 'bottom', 'left', 'right'];

const CORNER_TO_POSITION: Record<HudCorner, HudPosition> = {
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
export function normalizeHudPosition(value: unknown, fallback: HudPosition): HudPosition {
  if (typeof value === 'string' && value in CORNER_TO_POSITION) {
    return { ...CORNER_TO_POSITION[value as HudCorner] };
  }
  if (value && typeof value === 'object') {
    const v = value as { side?: unknown; offset?: unknown };
    if (
      typeof v.side === 'string' &&
      (HUD_SIDES as string[]).includes(v.side) &&
      typeof v.offset === 'number' &&
      Number.isFinite(v.offset)
    ) {
      return { side: v.side as HudSide, offset: Math.min(1, Math.max(0, v.offset)) };
    }
  }
  return { ...fallback };
}

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
  showStatus: boolean; // top-corner ACT/INT/POS readout
  showSysTag: boolean; // top-corner SYS://NODE identity tag
  showVignette: boolean; // darkened screen-edge vignette
  showEdgeGlow: boolean; // glowing border frame + corner accents
  showActivityBar: boolean; // mouse-following activity meter
  showColorFlash: boolean; // screen-reactive dominant-colour tint on bright frames
  showNotificationFlash: boolean; // full-screen flash on notifications
  // ── Meaningful / ambient channels (calm-tech: peripheral, glanceable) ──
  systemLoadGlow: boolean; // edge glow hue/pulse + glitch rate encode CPU/RAM
  showFocusRing: boolean; // screen-perimeter progress: pomodoro, else the hour
  breakReminders: boolean; // 20-20-20 break & posture nudge after a work streak
  presenceDimming: boolean; // calm/dim the overlay when idle-away
  // ── Screen-assist channels (react to what the analyser sees on screen) ──
  showTaskComplete: boolean; // pulse when a churning region (build/render/download) goes quiet
  showNotificationRadar: boolean; // directional ping toward a new popup you'd otherwise miss
  focusSpotlight: boolean; // dim the periphery around your work locus during deep focus
  focusDimStrength: number; // 0..1 peak periphery dim for the focus spotlight
  focusTrigger: FocusTrigger; // when the spotlight engages (typing-only vs any activity)
  cinemaMode: boolean; // stop drawing effects over detected video playback
  showSignalLog: boolean; // glanceable log of recent screen-assist events (retains the transient ones)
  showSessionTime: boolean; // ambient unbroken-session elapsed readout (screen-time / time-blindness aid)
  glitchFrequency: number;
  glitchConfig: GlitchConfig; // per-glitch-theme granular sub-effect knobs
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
  colorTheme: ThemePreset; // the colour palette
  glitchTheme: string; // id of the glitch style — independent of the colour theme
  pomodoro: PomodoroState;
  bootComplete: boolean;
  notificationFlash: number;
  presence: PresenceState;
  attention: AttentionAnalysis;
  lifetimeTasksDone: number; // running count of detected task completions (for the value-anchored support ask)
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
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Config payload sent to the main process. The per-display settings fields plus
 * global bits, targeted at one display (`targetDisplayId`) or all of them
 * (`applyToAll`).
 */
export type SetConfigPayload = Omit<Partial<OverlayState>, 'displays' | 'attention'> & {
  displays?: { id: number; enabled: boolean }[]; // only the user-controllable flag is sent
  attention?: { enabled: boolean; mode: AttentionMode; sensitivity: number; notifyOnComplete: boolean }; // config subset only
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
  id: number; // the attention region id that produced it (for de-dup)
  type: 'complete' | 'notification' | 'alert';
  label: string;
  time: number; // wall-clock ms when it fired
  away: boolean; // fired while the user was away
}

/** What a detected region is understood to be — drives colour, label and which
 * "help" effect (if any) reacts to it. */
export type AttentionType =
  | 'notification' // transient, rectangular popup/toast, usually in a corner
  | 'alert'        // large high-contrast dialog / modal, usually central
  | 'video'        // large region with sustained motion — media playback
  | 'text'         // dense, high-contrast, low-motion UI/text block
  | 'motion'       // generic movement (fallback)
  | 'complete';    // a region that was churning and has now gone quiet (task done)

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
  x: number; // normalised left   (0..1)
  y: number; // normalised top     (0..1)
  w: number; // normalised width   (0..1)
  h: number; // normalised height  (0..1)
  score: number; // salience 0..1
  type: AttentionType;
  label: string;
  activity: RegionActivity;
  peakMotion: number; // strongest motion observed while churning (0..1)
  born: number;
  lastSeen: number;
  settledAt: number; // ms timestamp of the churning→settled transition, else 0
  dismissed: boolean;
}

export interface AttentionAnalysis {
  enabled: boolean;
  mode: AttentionMode;
  sensitivity: number;
  notifyOnComplete: boolean; // fire a native OS notification (with sound) when a long task finishes

  gridCols: number; // internal analysis grid (informational)
  gridRows: number;
  regions: AttentionRegion[];
  prevFrame: Uint8Array | null;
  frameWidth: number;
  frameHeight: number;
}

export const THEMES: ThemePreset[] = [
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

export function getDefaultTheme(): ThemePreset {
  return THEMES[0];
}

/**
 * Available glitch styles. Names/swatches are intentionally glitch-flavoured (and
 * distinct from the colour theme names) to make clear this is a separate axis:
 * you pick a colour theme and a glitch style independently. Each `id` maps to an
 * implementation in `overlay/effects/glitches/`.
 */
export const GLITCH_THEMES: GlitchThemePreset[] = [
  { id: 'cyber', name: 'NEON GLITCH', swatch: ['#05d9e8', '#ff2a6d', '#00ff41'] },
  { id: 'matrix', name: 'DIGITAL RAIN', swatch: ['#00ff41', '#c8ffd0', '#0a8f2a'] },
  { id: 'synthwave', name: 'VHS / ANALOG', swatch: ['#ff6ec7', '#7b2ff7', '#00e5ff'] },
  { id: 'tron', name: 'GRID / WIRE', swatch: ['#00d4ff', '#ffffff', '#ff9900'] },
  { id: 'cyberpunk2077', name: 'BREACH', swatch: ['#fcee09', '#ff003c', '#00f0ff'] },
  { id: 'ghost', name: 'THERMOPTIC', swatch: ['#e8f4ff', '#7dffb0', '#888888'] },
  { id: 'terminator', name: 'IR HUD', swatch: ['#ff0000', '#ff4444', '#aa0000'] },
  { id: 'evangelion', name: 'NERV ALERT', swatch: ['#ff2a2a', '#ff6600', '#00ff66'] },
];

export function getDefaultGlitchThemeId(): string {
  return GLITCH_THEMES[0].id;
}

/** Whether `id` names a known glitch style. */
export function isGlitchThemeId(id: unknown): id is string {
  return typeof id === 'string' && GLITCH_THEMES.some((g) => g.id === id);
}

/**
 * The tunable sub-effects of each glitch theme. The keys here MUST match the
 * `on(c, key)` / `amt(c, key)` checks in the corresponding
 * `overlay/effects/glitches/<id>.ts` spawn function. This is the single source
 * of truth for both the config UI and the default {@link GlitchConfig}.
 */
export const GLITCH_PARAMS: Record<string, GlitchParamDef[]> = {
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
export function createDefaultGlitchConfig(): GlitchConfig {
  const cfg: GlitchConfig = {};
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
export function normalizeGlitchConfig(value: unknown): GlitchConfig {
  const base = createDefaultGlitchConfig();
  if (!value || typeof value !== 'object') return base;
  const v = value as GlitchConfig;
  for (const themeId of Object.keys(base)) {
    const incoming = v[themeId];
    if (!incoming) continue;
    for (const key of Object.keys(base[themeId])) {
      const iv = incoming[key];
      if (iv && typeof iv === 'object') {
        if (typeof iv.enabled === 'boolean') base[themeId][key].enabled = iv.enabled;
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
] as const;

export type DisplaySettingKey = (typeof DISPLAY_SETTING_KEYS)[number];
export type DisplaySettings = Pick<OverlayState, DisplaySettingKey>;

/** Deep-clone a settings object (plain data only) so displays don't share refs. */
export function cloneDisplaySettings(ds: DisplaySettings): DisplaySettings {
  return JSON.parse(JSON.stringify(ds)) as DisplaySettings;
}

/** Pull the per-display-configurable subset out of a full state (deep-cloned). */
export function extractDisplaySettings(s: OverlayState): DisplaySettings {
  const out = {} as Record<string, unknown>;
  for (const k of DISPLAY_SETTING_KEYS) out[k] = s[k];
  return cloneDisplaySettings(out as DisplaySettings);
}

export function createDefaultState(): OverlayState {
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
