import { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage, desktopCapturer, globalShortcut, Notification, session, shell } from 'electron';
import type { NativeImage } from 'electron';
import { join } from 'path';
import { uIOhook } from 'uiohook-napi';
import { deflateSync } from 'zlib';
import type { OverlayState, InputMouseData, AttentionMode, HudLayout, DisplaySettings } from '../../src/renderer/shared/types';
import {
  createDefaultState,
  THEMES,
  GLITCH_THEMES,
  isGlitchThemeId,
  normalizeHudPosition,
  DISPLAY_SETTING_KEYS,
  extractDisplaySettings,
  normalizeGlitchConfig,
  HUD_LAYOUT_KEYS,
} from '../../src/renderer/shared/types';
import * as os from 'os';
import { analyzeScreenForAttention } from './screenAttention';
import { loadSettings, saveSettings, extractSettings, applySettings } from './settings';

// Linux transparency: request an ARGB visual so the transparent, click-through
// overlay composites correctly. We deliberately keep GPU acceleration and GPU
// compositing ENABLED — the overlay is a full-screen canvas redrawn every frame
// on every display, so software rasterization here was the app's single largest
// CPU cost. If transparency/click-through regresses on a specific compositor,
// re-add `--disable-gpu-compositing` (and, as a last resort,
// `app.disableHardwareAcceleration()`) below.
app.commandLine.appendSwitch('--enable-transparent-visuals');

// The overlay analyses mic audio via Web Audio; it never receives a user
// gesture (it's click-through), so allow the AudioContext to run regardless.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let tray: Tray | null = null;
const overlayWindows = new Map<number, BrowserWindow>();
let configWindow: BrowserWindow | null = null;
let bootStartTime = Date.now();

// `state` holds the SHARED runtime (input, system, screen, presence, pomodoro,
// attention, displays, master toggle) plus the DEFAULT settings template that
// new displays inherit. Per-display overrides live in `displaySettings`.
const state: OverlayState = createDefaultState();

// One settings object per display id. Each overlay window renders the merge of
// the shared runtime + its display's settings (see effectiveFor).
const displaySettings = new Map<number, DisplaySettings>();

// Which display the config window is currently editing.
let configSelectedDisplayId: number | null = null;

function firstDisplayId(): number | null {
  return state.displays[0]?.id ?? null;
}

// The display the config window edits, guarded against a stale/removed id.
function configDisplayId(): number | null {
  if (configSelectedDisplayId != null && state.displays.some((d) => d.id === configSelectedDisplayId)) {
    return configSelectedDisplayId;
  }
  return firstDisplayId();
}

function settingsForDisplay(id: number): DisplaySettings {
  let ds = displaySettings.get(id);
  if (!ds) {
    ds = extractDisplaySettings(state); // seed from the current default template
    displaySettings.set(id, ds);
  }
  return ds;
}

// The flat OverlayState a given display's overlay renders: shared runtime with
// that display's settings layered on top.
function effectiveFor(id: number): OverlayState {
  return { ...state, ...settingsForDisplay(id) };
}

// Ensure every current display has a settings entry (called after detection).
function seedDisplaySettings(): void {
  for (const d of state.displays) if (!displaySettings.has(d.id)) settingsForDisplay(d.id);
}

// Apply a settings patch to one display, or (when `all`) to every display plus
// the default template so new displays inherit it. Each target gets its own
// deep copy so displays never share nested layout/theme/config objects.
function applyDisplaySettings(patch: Partial<DisplaySettings>, targetId: number | null, all: boolean): void {
  const targets: DisplaySettings[] = [];
  if (all || targetId == null) {
    Object.assign(state, JSON.parse(JSON.stringify(patch)));
    for (const ds of displaySettings.values()) targets.push(ds);
  } else {
    targets.push(settingsForDisplay(targetId));
  }
  for (const ds of targets) Object.assign(ds, JSON.parse(JSON.stringify(patch)));
}

// ─── Settings Persistence ───────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;

// Debounced write of the persistable settings. Hooked into rebuildTrayMenu()
// (the single chokepoint every settings change flows through) so tray, hotkey
// and config-window edits are all captured without touching hot paths like the
// periodic broadcast or the pomodoro tick.
function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveSettings(extractSettings(state, displaySettings));
  }, 800);
}

// ─── Tray Icon ──────────────────────────────────────────────────

function createTrayIcon(): NativeImage {
  const size = 16;
  const pixels: number[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1;
      const is88 = (y >= 3 && y <= 5 && ((x >= 3 && x <= 4) || (x >= 7 && x <= 8))) ||
                   (y >= 10 && y <= 12 && ((x >= 3 && x <= 4) || (x >= 7 && x <= 8)));
      if (isBorder) pixels.push(5, 217, 232, 255);
      else if (is88) pixels.push(0, 255, 65, 255);
      else pixels.push(10, 10, 10, 255);
    }
  }
  return nativeImage.createFromBuffer(encodePNG(size, size, Buffer.from(pixels)));
}

function encodePNG(width: number, height: number, rgba: Buffer): Buffer {
  const rawRows: number[] = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(0);
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawRows.push(rgba[idx], rgba[idx + 1], rgba[idx + 2], rgba[idx + 3]);
    }
  }
  const compressed = deflateSync(Buffer.from(rawRows));
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
    return Buffer.concat([len, typeB, data, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
}

function crc32(buf: Buffer): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ─── Display Management ─────────────────────────────────────────

function detectDisplays(): void {
  const displays = screen.getAllDisplays();
  state.displays = displays.map((d) => {
    const existing = state.displays.find((sd) => sd.id === d.id);
    return {
      id: d.id,
      label: `Display ${d.id} (${d.bounds.width}x${d.bounds.height})`,
      bounds: d.bounds,
      // Keep the user's choice for displays we've already seen; new displays
      // default to enabled so effects show on every screen.
      enabled: existing ? existing.enabled : true,
    };
  });
  seedDisplaySettings();
  console.log(`[Hronomancer] Detected ${displays.length} display(s)`);
}

function createOverlayForDisplay(display: Electron.Display): void {
  if (overlayWindows.has(display.id)) return;

  const { x, y, width, height } = display.bounds;

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('display-info', {
      displayId: display.id,
      bounds: display.bounds,
    });
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}/overlay/index.html`);
  } else {
    win.loadFile(join(__dirname, '../renderer/overlay/index.html'));
  }

  overlayWindows.set(display.id, win);
}

function destroyOverlayForDisplay(displayId: number): void {
  const win = overlayWindows.get(displayId);
  if (win && !win.isDestroyed()) win.close();
  overlayWindows.delete(displayId);
}

function syncOverlays(): void {
  // During the boot sequence, show the overlay on every display regardless of
  // per-display enable state so the boot animation plays on all screens. Once
  // boot completes, overlays on displays not enabled for effects are torn down
  // (see checkBootComplete).
  const bootPhase = !state.bootComplete;
  const shouldShow = (displayId: number): boolean => {
    if (!state.effectsEnabled) return false;
    if (bootPhase) return true;
    return state.displays.find((d) => d.id === displayId)?.enabled ?? false;
  };

  for (const [id] of overlayWindows) {
    if (!shouldShow(id)) destroyOverlayForDisplay(id);
  }
  for (const display of screen.getAllDisplays()) {
    if (shouldShow(display.id)) createOverlayForDisplay(display);
  }
}

// ─── Broadcast State ────────────────────────────────────────────

// Strip `attention.prevFrame` — a full screen-capture buffer (~tens of KB) used
// only by the main process for motion diffing — before structured-cloning a
// payload to a renderer (~10×/second, per window).
function stripPayload(s: OverlayState): OverlayState {
  const { prevFrame: _prevFrame, ...attention } = s.attention;
  return { ...s, attention } as unknown as OverlayState;
}

// Each overlay window gets the effective state for ITS display; the config
// window gets the effective state for the display it's currently editing.
function broadcastState(): void {
  for (const [id, win] of overlayWindows) {
    if (!win.isDestroyed()) win.webContents.send('state-update', stripPayload(effectiveFor(id)));
  }
  if (configWindow && !configWindow.isDestroyed()) {
    const id = configDisplayId();
    configWindow.webContents.send('state-update', stripPayload(id != null ? effectiveFor(id) : state));
  }
}

// ─── Tray Menu ──────────────────────────────────────────────────

function rebuildTrayMenu(): void {
  const displaySubmenu = state.displays.map((d) => ({
    label: `${d.label} ${d.enabled ? '✓' : '✗'}`,
    click: () => { d.enabled = !d.enabled; rebuildTrayMenu(); syncOverlays(); broadcastState(); },
  }));

  // Tray has no display context, so its theme/glitch/intensity changes apply to
  // every display (and the default template). The ✓ reflects the default.
  const themeSubmenu = THEMES.map((t) => ({
    label: `${t.name} ${state.colorTheme.id === t.id ? '✓' : ''}`,
    click: () => { applyDisplaySettings({ colorTheme: t }, null, true); rebuildTrayMenu(); broadcastState(); },
  }));

  const glitchSubmenu = GLITCH_THEMES.map((g) => ({
    label: `${g.name} ${state.glitchTheme === g.id ? '✓' : ''}`,
    click: () => { applyDisplaySettings({ glitchTheme: g.id }, null, true); rebuildTrayMenu(); broadcastState(); },
  }));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'HRONOMANCER', enabled: false },
    { type: 'separator' },
    {
      label: state.effectsEnabled ? 'Effects: ON' : 'Effects: OFF',
      click: () => { state.effectsEnabled = !state.effectsEnabled; rebuildTrayMenu(); syncOverlays(); broadcastState(); },
    },
    { label: 'Open Config', click: createConfigWindow },
    { type: 'separator' },
    { label: 'Color Theme', submenu: themeSubmenu },
    { label: 'Glitch Style', submenu: glitchSubmenu },
    { label: 'Displays', submenu: displaySubmenu },
    {
      label: 'Intensity',
      submenu: [
        { label: 'Low (30%)', click: () => { applyDisplaySettings({ intensity: 0.3 }, null, true); rebuildTrayMenu(); broadcastState(); }},
        { label: 'Medium (50%)', click: () => { applyDisplaySettings({ intensity: 0.5 }, null, true); rebuildTrayMenu(); broadcastState(); }},
        { label: 'High (70%)', click: () => { applyDisplaySettings({ intensity: 0.7 }, null, true); rebuildTrayMenu(); broadcastState(); }},
        { label: 'MAX (100%)', click: () => { applyDisplaySettings({ intensity: 1.0 }, null, true); rebuildTrayMenu(); broadcastState(); }},
      ],
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { try { uIOhook.stop(); } catch {} app.quit(); }},
  ]);
  tray?.setContextMenu(contextMenu);

  // Every settings mutation (tray, hotkey, config window, display change) ends
  // up here, so this is where we persist.
  scheduleSave();
}

// ─── Config Window ──────────────────────────────────────────────

function createConfigWindow(): void {
  if (configWindow && !configWindow.isDestroyed()) {
    configWindow.focus();
    return;
  }

  // Default the config window to editing the first display.
  if (configSelectedDisplayId == null) configSelectedDisplayId = firstDisplayId();

  // The overlays stay visible while the config window is open so effect and
  // layout changes preview live. They're click-through, and the config window
  // sits above them (screen-saver level + focused), so it still takes input.
  configWindow = new BrowserWindow({
    width: 420,
    height: 600,
    resizable: false,
    frame: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  configWindow.setAlwaysOnTop(true, 'screen-saver');
  configWindow.focus();

  configWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') configWindow?.close();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    configWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/config/index.html`);
  } else {
    configWindow.loadFile(join(__dirname, '../renderer/config/index.html'));
  }

  configWindow.on('closed', () => {
    configWindow = null;
    // Reconcile overlays in case a display/effects toggle changed which screens
    // should be showing.
    syncOverlays();
  });
}

// ─── Input Monitoring ───────────────────────────────────────────

function setupInputMonitoring(): void {
  let prevX = 0;
  let prevY = 0;
  let lastSend = 0;

  try {
    uIOhook.on('mousemove', (e) => {
      const now = Date.now();
      state.mouseVel.x = e.x - prevX;
      state.mouseVel.y = e.y - prevY;
      prevX = e.x;
      prevY = e.y;
      state.prevMouse.x = state.mouse.x;
      state.prevMouse.y = state.mouse.y;
      state.mouse.x = e.x;
      state.mouse.y = e.y;
      state.lastActivity = now;

      if (now - lastSend > 16) {
        const data: InputMouseData = { x: e.x, y: e.y, vx: state.mouseVel.x, vy: state.mouseVel.y };
        for (const [, win] of overlayWindows) {
          if (!win.isDestroyed()) win.webContents.send('input-mouse', data);
        }
        lastSend = now;
      }
    });

    uIOhook.on('keydown', (e) => {
      state.lastActivity = Date.now();
      state.keystrokes.push({ key: e.keycode, time: Date.now() });
      if (state.keystrokes.length > 50) state.keystrokes.shift();
      for (const [, win] of overlayWindows) {
        if (!win.isDestroyed()) win.webContents.send('input-key', { keycode: e.keycode });
      }
    });

    uIOhook.on('mousedown', (e) => {
      state.lastActivity = Date.now();
      for (const [, win] of overlayWindows) {
        if (!win.isDestroyed()) win.webContents.send('input-click', { x: e.x, y: e.y, button: e.button });
      }
    });

    uIOhook.start();
    console.log('[Hronomancer] Input monitoring started');
  } catch (err) {
    console.error('[Hronomancer] Failed to start input monitoring:', err);
  }
}

// ─── Hotkeys ────────────────────────────────────────────────────

function registerHotkeys(): void {
  try {
    globalShortcut.register('Ctrl+Alt+H', () => {
      state.effectsEnabled = !state.effectsEnabled;
      rebuildTrayMenu();
      syncOverlays();
      broadcastState();
    });
    globalShortcut.register('Ctrl+Alt+T', () => {
      const idx = THEMES.findIndex((t) => t.id === state.colorTheme.id);
      applyDisplaySettings({ colorTheme: THEMES[(idx + 1) % THEMES.length] }, null, true);
      rebuildTrayMenu();
      broadcastState();
    });
    globalShortcut.register('Ctrl+Alt+G', () => {
      const idx = GLITCH_THEMES.findIndex((g) => g.id === state.glitchTheme);
      applyDisplaySettings({ glitchTheme: GLITCH_THEMES[(idx + 1) % GLITCH_THEMES.length].id }, null, true);
      rebuildTrayMenu();
      broadcastState();
    });
    globalShortcut.register('Ctrl+Alt+U', () => {
      configWindow ? configWindow.close() : createConfigWindow();
    });
    globalShortcut.register('Ctrl+Alt+P', () => {
      togglePomodoro();
    });
    console.log('[Hronomancer] Hotkeys registered: Ctrl+Alt+H (toggle), Ctrl+Alt+T (color theme), Ctrl+Alt+G (glitch style), Ctrl+Alt+U (config), Ctrl+Alt+P (pomodoro)');
  } catch (err) {
    console.error('[Hronomancer] Failed to register hotkeys:', err);
  }
}

// ─── System Stats ───────────────────────────────────────────────

let prevCpuIdle = 0;
let prevCpuTotal = 0;

function updateSystemStats(): void {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type of Object.keys(cpu.times)) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  }

  const idleDiff = totalIdle - prevCpuIdle;
  const totalDiff = totalTick - prevCpuTotal;
  prevCpuIdle = totalIdle;
  prevCpuTotal = totalTick;

  state.system.cpu = totalDiff > 0 ? Math.round((1 - idleDiff / totalDiff) * 100) : 0;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  state.system.ram = Math.round(((totalMem - freeMem) / totalMem) * 100);
  state.system.ramTotal = Math.round(totalMem / (1024 * 1024 * 1024));
  state.system.uptime = Math.floor(os.uptime());
}

// ─── Pomodoro ───────────────────────────────────────────────────

function togglePomodoro(): void {
  if (state.pomodoro.active) {
    state.pomodoro.active = false;
    state.pomodoro.phase = 'work';
    state.pomodoro.remainingSeconds = state.pomodoro.totalSeconds;
  } else {
    state.pomodoro.active = true;
    state.pomodoro.phase = 'work';
    state.pomodoro.remainingSeconds = 25 * 60;
    state.pomodoro.totalSeconds = 25 * 60;
  }
  broadcastState();
}

function updatePomodoro(): void {
  if (!state.pomodoro.active) return;
  state.pomodoro.remainingSeconds--;
  if (state.pomodoro.remainingSeconds <= 0) {
    if (state.pomodoro.phase === 'work') {
      state.pomodoro.phase = 'break';
      state.pomodoro.remainingSeconds = 5 * 60;
      state.pomodoro.totalSeconds = 5 * 60;
      triggerNotification('HRONOMANCER', 'Break time! Take 5 minutes.');
    } else {
      state.pomodoro.phase = 'work';
      state.pomodoro.remainingSeconds = 25 * 60;
      state.pomodoro.totalSeconds = 25 * 60;
      triggerNotification('HRONOMANCER', 'Work session starting!');
    }
  }
  broadcastState();
}

// ─── Notifications ──────────────────────────────────────────────

function triggerNotification(title: string, body: string): void {
  state.notificationFlash = 1.0;
  broadcastState();
  try {
    new Notification({ title, body }).show();
  } catch {}
}

// Native OS notification when the analyser sees a long-running region go quiet.
// This is the one Screen-Assist signal that must survive the user having looked
// away, so it fires as a real (sound-carrying) OS notification rather than only
// an on-canvas pulse. Rate-limited so a burst of settling regions can't spam.
let lastTaskDoneNotify = 0;
function notifyTaskDone(): void {
  if (!state.effectsEnabled || !state.attention.notifyOnComplete) return;
  const now = Date.now();
  if (now - lastTaskDoneNotify < 8000) return;
  lastTaskDoneNotify = now;
  try {
    new Notification({
      title: 'HRONOMANCER // TASK COMPLETE',
      body: 'A busy region on screen just went quiet — it looks finished.',
    }).show();
  } catch {}
}

// ─── Activity & Screen Analysis ─────────────────────────────────

function updateActivityLevel(): void {
  const now = Date.now();
  const timeSinceActivity = now - state.lastActivity;
  const recentKeystrokes = state.keystrokes.filter((k) => now - k.time < 2000).length;
  const mouseSpeed = Math.sqrt(state.mouseVel.x ** 2 + state.mouseVel.y ** 2);
  let activity = 0;
  activity += Math.max(0, 1 - timeSinceActivity / 5000) * 0.3;
  activity += Math.min(recentKeystrokes / 10, 1) * 0.4;
  activity += Math.min(mouseSpeed / 50, 1) * 0.3;
  state.activityLevel = state.activityLevel * 0.85 + activity * 0.15;

  // Decay notification flash
  if (state.notificationFlash > 0) {
    state.notificationFlash = Math.max(0, state.notificationFlash - 0.02);
  }
}

// ─── Presence & Break Rhythm ────────────────────────────────────
// Powers the calm-tech channels: dim when the user steps away, and nudge a
// 20-20-20 break after a long uninterrupted work streak.

const PRESENCE_AWAY_MS = 120_000; // no input for 2 min → treat as "away"
const BREAK_RESET_MS = 45_000; // a ≥45s pause counts as a micro-break, resetting the streak
const BREAK_DUE_MS = 20 * 60_000; // 20 min continuous → break due (the "20" in 20-20-20)
const BREAK_OVERDUE_MS = 30 * 60_000; // 30 min continuous → overdue

// Start of the current uninterrupted work streak. Reset whenever the user takes
// a real pause (idle ≥ BREAK_RESET_MS), so the streak reflects continuous work.
let workStreakStart = Date.now();

function updatePresence(): void {
  const now = Date.now();
  const idleMs = now - state.lastActivity;
  const active = idleMs < PRESENCE_AWAY_MS;

  // Any sufficiently long pause is a break — restart the streak clock.
  if (idleMs > BREAK_RESET_MS) workStreakStart = now;

  const continuousActiveMs = active ? now - workStreakStart : 0;
  let breakLevel = 0;
  if (continuousActiveMs > BREAK_OVERDUE_MS) breakLevel = 2;
  else if (continuousActiveMs > BREAK_DUE_MS) breakLevel = 1;

  state.presence = { idleMs, active, continuousActiveMs, breakLevel };
}

let prevScreenData: Uint8Array | null = null;

// Sample every Nth pixel of the (still tiny) thumbnail. The aggregate stats —
// mean brightness/colour, motion, quadrant brightness — are unchanged at this
// granularity while the per-tick pixel work drops ~4×.
const SCREEN_SAMPLE_STEP = 2;

// Capture resolution. Bumped from 160×90 so the attention analyser's 32×18 grid
// gets ~8×8 px per cell — enough for connected-component bounding boxes to trace
// the real shape of a popup/dialog rather than snapping to a coarse block. Still
// a ~37k-pixel thumbnail, so the per-frame scan stays cheap.
const CAPTURE_W = 256;
const CAPTURE_H = 144;

// Returns whether the screen is *actively* changing, so the capture loop can
// decide to sample faster for a moment (see captureLoop).
async function analyzeScreen(): Promise<boolean> {
  // With effects off, overlays are torn down and nothing consumes screen data —
  // so skip the (expensive) capture + pixel scan entirely rather than running it
  // in the background.
  if (!state.effectsEnabled) return false;
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: CAPTURE_W, height: CAPTURE_H } });
    if (sources.length === 0) return false;
    const pixels = sources[0].thumbnail.toBitmap();
    const size = sources[0].thumbnail.getSize();
    const prev = prevScreenData;
    const prevReady = !!prev && prev.length === pixels.length;
    let totalR = 0, totalG = 0, totalB = 0, totalBrightness = 0;
    const qW = Math.floor(size.width / 2), qH = Math.floor(size.height / 2);
    let qTL = 0, qTR = 0, qBL = 0, qBR = 0;
    let qTLc = 0, qTRc = 0, qBLc = 0, qBRc = 0;
    let motionSum = 0;
    let count = 0;

    for (let y = 0; y < size.height; y += SCREEN_SAMPLE_STEP) {
      for (let x = 0; x < size.width; x += SCREEN_SAMPLE_STEP) {
        const idx = (y * size.width + x) * 4;
        const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
        totalR += r; totalG += g; totalB += b;
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        totalBrightness += brightness;
        if (x < qW && y < qH) { qTL += brightness; qTLc++; }
        else if (x >= qW && y < qH) { qTR += brightness; qTRc++; }
        else if (x < qW && y >= qH) { qBL += brightness; qBLc++; }
        else { qBR += brightness; qBRc++; }
        if (prevReady) {
          motionSum += (Math.abs(r - prev![idx]) + Math.abs(g - prev![idx + 1]) + Math.abs(b - prev![idx + 2])) / (3 * 255);
        }
        count++;
      }
    }

    if (count === 0) return false;
    state.screen.brightness = totalBrightness / count;
    state.screen.dominantColor = [Math.round(totalR / count), Math.round(totalG / count), Math.round(totalB / count)];
    state.screen.motion = Math.min(motionSum / count * 10, 1);
    state.screen.regions = {
      topLeft: qTLc > 0 ? qTL / qTLc : 0,
      topRight: qTRc > 0 ? qTR / qTRc : 0,
      bottomLeft: qBLc > 0 ? qBL / qBLc : 0,
      bottomRight: qBRc > 0 ? qBR / qBRc : 0,
    };

    // Run attention analysis on the same frame (it reads state.attention.prevFrame
    // for its own motion diff, which we refresh just below). Its pulse plus the
    // whole-frame motion decide whether the capture loop should sample faster.
    let pulse = { anyNew: false, anyChurning: false, anyComplete: false };
    if (state.attention.enabled) {
      pulse = analyzeScreenForAttention(pixels, size.width, size.height, state.attention);
      // A long-running region just went quiet: count it, and (the headline value)
      // fire a native OS notification so the finish is caught even when the overlay
      // — or the whole app — isn't the focused window.
      if (pulse.anyComplete) {
        state.lifetimeTasksDone++;
        notifyTaskDone();
      }
    }

    // One shared previous-frame copy for the next tick. Both the whole-frame
    // stats above and the attention pass diff against it, so we allocate it once
    // here instead of once here plus once inside analyzeScreenForAttention.
    const frameCopy = new Uint8Array(pixels);
    prevScreenData = frameCopy;
    state.attention.prevFrame = frameCopy;

    return state.screen.motion > 0.03 || pulse.anyNew || pulse.anyChurning || pulse.anyComplete;
  } catch {
    return false;
  }
}

// ─── Adaptive capture cadence ───────────────────────────────────
// Idle at 2 Hz (cheap), but burst to ~8 Hz for a short window whenever the
// screen is actively changing, so transient popups and the moment a long task
// finishes are caught promptly — without paying the capture cost while nothing
// on screen is moving.
const CAPTURE_IDLE_MS = 500;
const CAPTURE_FAST_MS = 120;
const CAPTURE_BURST_MS = 2000;
let captureTimer: ReturnType<typeof setTimeout> | null = null;
let captureFastUntil = 0;

async function captureLoop(): Promise<void> {
  let active = false;
  try {
    active = await analyzeScreen();
  } catch {}
  if (active) captureFastUntil = Date.now() + CAPTURE_BURST_MS;
  const interval = Date.now() < captureFastUntil ? CAPTURE_FAST_MS : CAPTURE_IDLE_MS;
  captureTimer = setTimeout(captureLoop, interval);
}

// ─── IPC ────────────────────────────────────────────────────────

ipcMain.on('get-state', (e) => {
  // Reply with the effective state for the requesting overlay's display; for the
  // config window (or anything else) use the display it's currently editing.
  for (const [id, win] of overlayWindows) {
    if (!win.isDestroyed() && win.webContents === e.sender) {
      e.reply('state-update', stripPayload(effectiveFor(id)));
      return;
    }
  }
  const id = configDisplayId();
  e.reply('state-update', stripPayload(id != null ? effectiveFor(id) : state));
});

// The config window tells us which display it's editing; reply with that
// display's effective settings so the panel reflects it immediately.
ipcMain.on('select-display', (_e, displayId: number) => {
  if (typeof displayId === 'number') configSelectedDisplayId = displayId;
  if (configWindow && !configWindow.isDestroyed()) {
    const id = configDisplayId();
    configWindow.webContents.send('state-update', stripPayload(id != null ? effectiveFor(id) : state));
  }
});

ipcMain.on('set-config', (_e, config: Record<string, unknown>) => {
  // Split the flattened payload into: GLOBAL fields (master toggle, attention,
  // per-display enable flags) and the per-display SETTINGS patch. Nested runtime
  // state (attention.regions/prevFrame, live pomodoro) is never overwritten.
  const { attention, displays, effectsEnabled, targetDisplayId, applyToAll } = config as {
    attention?: Partial<OverlayState['attention']>;
    displays?: { id: number; enabled: boolean }[];
    effectsEnabled?: boolean;
    targetDisplayId?: number;
    applyToAll?: boolean;
  };

  // Global master toggle.
  if (typeof effectsEnabled === 'boolean') state.effectsEnabled = effectsEnabled;

  // Global per-display enable flags (which screens show overlays at all).
  if (Array.isArray(displays)) {
    for (const d of displays) {
      const existing = state.displays.find((sd) => sd.id === d.id);
      if (existing) existing.enabled = !!d.enabled;
    }
  }

  // Global attention analysis config (single screen-capture pipeline).
  if (attention && typeof attention === 'object') {
    if (typeof attention.enabled === 'boolean') state.attention.enabled = attention.enabled;
    if (typeof attention.mode === 'string') state.attention.mode = attention.mode as AttentionMode;
    if (typeof attention.sensitivity === 'number') state.attention.sensitivity = attention.sensitivity;
    if (typeof attention.notifyOnComplete === 'boolean') state.attention.notifyOnComplete = attention.notifyOnComplete;
  }

  // Build the validated per-display settings patch from the known keys only.
  const patch: Partial<DisplaySettings> = {};
  for (const key of DISPLAY_SETTING_KEYS) {
    const v = (config as Record<string, unknown>)[key];
    if (v !== undefined) (patch as Record<string, unknown>)[key] = v;
  }
  if (patch.glitchTheme !== undefined && !isGlitchThemeId(patch.glitchTheme)) delete patch.glitchTheme;
  if (patch.colorTheme !== undefined && typeof patch.colorTheme !== 'object') delete patch.colorTheme;
  if (patch.layout !== undefined) {
    const l = patch.layout as Partial<HudLayout>;
    const norm = {} as HudLayout;
    for (const k of HUD_LAYOUT_KEYS) norm[k] = normalizeHudPosition(l[k], state.layout[k]);
    patch.layout = norm;
  }
  if (patch.glitchConfig !== undefined) patch.glitchConfig = normalizeGlitchConfig(patch.glitchConfig);

  const target = typeof targetDisplayId === 'number' ? targetDisplayId : null;
  applyDisplaySettings(patch, target, !!applyToAll);

  rebuildTrayMenu();
  syncOverlays();
  broadcastState();
});

ipcMain.on('close-window', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && !win.isDestroyed()) win.close();
});

ipcMain.on('window-move', (e, offsetX: number, offsetY: number) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  if (win && !win.isDestroyed()) {
    const [winX, winY] = win.getPosition();
    win.setPosition(winX + offsetX, winY + offsetY);
  }
});

// Open an external link (the support / "buy me a coffee" page) in the user's
// browser. Guarded to http(s) so a stray payload can't launch arbitrary schemes.
ipcMain.on('open-external', (_e, url: string) => {
  if (typeof url === 'string' && /^https:\/\//i.test(url)) {
    void shell.openExternal(url);
  }
});

ipcMain.on('start-pomodoro', () => { togglePomodoro(); });

ipcMain.on('set-pomodoro-work', (_e, minutes: number) => {
  state.pomodoro.totalSeconds = minutes * 60;
  state.pomodoro.remainingSeconds = minutes * 60;
  broadcastState();
});

// ─── Boot Animation ─────────────────────────────────────────────

function checkBootComplete(): void {
  if (!state.bootComplete && Date.now() - bootStartTime > 3000) {
    state.bootComplete = true;
    // Boot finished: drop the extra overlays we spun up on non-enabled
    // displays for the boot animation.
    syncOverlays();
    broadcastState();
  }
}

// ─── App Lifecycle ──────────────────────────────────────────────

app.whenReady().then(() => {
  console.log('[Hronomancer] Starting...');

  // Auto-grant the mic permission the overlay's audio visualizer needs. This
  // is our own always-on renderer, so there's no interactive prompt to show.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'media');
  });
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media');

  // Restore persisted settings before displays are detected and overlays are
  // created, so saved theme/effects/per-display choices take effect on launch.
  const persisted = loadSettings();
  if (persisted) {
    applySettings(state, displaySettings, persisted);
    console.log('[Hronomancer] Loaded saved settings');
  }

  try {
    tray = new Tray(createTrayIcon());
    tray.setToolTip('Hronomancer');
    rebuildTrayMenu();
    tray.on('click', createConfigWindow);
    console.log('[Hronomancer] Tray icon created');
  } catch (err) {
    console.error('[Hronomancer] Failed to create tray:', err);
  }

  detectDisplays();
  rebuildTrayMenu();
  syncOverlays();
  setupInputMonitoring();
  registerHotkeys();

  setInterval(updateActivityLevel, 100);
  setInterval(updatePresence, 1000);
  captureLoop(); // self-scheduling adaptive-cadence screen analysis (see captureLoop)
  setInterval(updateSystemStats, 2000);
  setInterval(updatePomodoro, 1000);
  setInterval(checkBootComplete, 500);
  // Mouse input is streamed on its own ~60 Hz channel; this broadcast only
  // carries the slower-moving fields (activity, screen, system, attention,
  // pomodoro), the fastest of which updates every 100ms and decays smoothly —
  // so 200ms is imperceptible here and halves the structured-clone IPC traffic
  // fanned out to every overlay + the config window.
  setInterval(broadcastState, 200);

  updateSystemStats();

  screen.on('display-added', () => {
    detectDisplays();
    rebuildTrayMenu();
    syncOverlays();
    broadcastState();
  });

  screen.on('display-removed', () => {
    detectDisplays();
    rebuildTrayMenu();
    syncOverlays();
    broadcastState();
  });

  console.log('[Hronomancer] Ready');
});

app.on('window-all-closed', () => {});
app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  if (captureTimer) clearTimeout(captureTimer);
  try { uIOhook.stop(); } catch {}
});
