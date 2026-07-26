import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import type {
  AttentionMode,
  DisplaySettings,
  HudLayout,
  InputClickData,
  InputKeyData,
  InputMouseData,
  OverlayState,
  PerformanceProfile,
  SetConfigPayload,
} from '../shared/types';
import {
  createDefaultState,
  DISPLAY_SETTING_KEYS,
  extractDisplaySettings,
  GLITCH_THEMES,
  HUD_LAYOUT_KEYS,
  isGlitchThemeId,
  normalizeGlitchConfig,
  normalizeHudPosition,
  THEMES,
} from '../shared/types';
import { analyzeScreenForAttention } from './screenAttention';
import {
  applySettings,
  extractSettings,
  loadSettings,
  saveSettings,
} from './settings';

interface NativeMonitor {
  id: number;
  name: string;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
}

interface NativeInput {
  kind: 'mouse' | 'key' | 'click';
  x?: number;
  y?: number;
  button?: number;
  key?: string;
}

interface SystemStats {
  cpu: number;
  ram: number;
  ramTotal: number;
  uptime: number;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded';

const RELEASES_URL = 'https://github.com/Netroforge/hronomancer/releases';
const state: OverlayState = createDefaultState();
const displaySettings = new Map<number, DisplaySettings>();
interface DisplayRuntime {
  screen: OverlayState['screen'];
  attention: OverlayState['attention'];
  prevScreenData: Uint8Array | null;
}
const displayRuntime = new Map<number, DisplayRuntime>();
let configSelectedDisplayId: number | null = null;
let bootStartTime = Date.now();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let captureTimer: ReturnType<typeof setTimeout> | null = null;
let updateStatus: UpdateStatus = 'idle';
let updateVersion: string | null = null;
let monitorSignature = '';

function firstDisplayId(): number | null {
  return state.displays[0]?.id ?? null;
}

function configDisplayId(): number | null {
  if (
    configSelectedDisplayId != null &&
    state.displays.some((display) => display.id === configSelectedDisplayId)
  ) {
    return configSelectedDisplayId;
  }
  return firstDisplayId();
}

function settingsForDisplay(id: number): DisplaySettings {
  let settings = displaySettings.get(id);
  if (!settings) {
    settings = extractDisplaySettings(state);
    displaySettings.set(id, settings);
  }
  return settings;
}

function runtimeForDisplay(id: number): DisplayRuntime {
  let runtime = displayRuntime.get(id);
  if (!runtime) {
    const defaults = createDefaultState();
    runtime = {
      screen: structuredClone(defaults.screen),
      attention: structuredClone(defaults.attention),
      prevScreenData: null,
    };
    displayRuntime.set(id, runtime);
  }
  runtime.attention.enabled = state.attention.enabled;
  runtime.attention.mode = state.attention.mode;
  runtime.attention.sensitivity = state.attention.sensitivity;
  runtime.attention.notifyOnComplete = state.attention.notifyOnComplete;
  return runtime;
}

function effectiveFor(id: number): OverlayState {
  const runtime = runtimeForDisplay(id);
  return {
    ...state,
    ...settingsForDisplay(id),
    screen: runtime.screen,
    attention: runtime.attention,
  };
}

function seedDisplaySettings(): void {
  for (const display of state.displays) {
    if (!displaySettings.has(display.id)) settingsForDisplay(display.id);
    if (!displayRuntime.has(display.id)) runtimeForDisplay(display.id);
  }
  const liveIds = new Set(state.displays.map(({ id }) => id));
  for (const id of displaySettings.keys()) {
    if (!liveIds.has(id)) displaySettings.delete(id);
  }
  for (const id of displayRuntime.keys()) {
    if (!liveIds.has(id)) displayRuntime.delete(id);
  }
}

function applyDisplaySettings(
  patch: Partial<DisplaySettings>,
  targetId: number | null,
  all: boolean,
): void {
  const targets: DisplaySettings[] = [];
  if (all || targetId == null) {
    Object.assign(state, structuredClone(patch));
    targets.push(...displaySettings.values());
  } else {
    targets.push(settingsForDisplay(targetId));
  }
  for (const target of targets) Object.assign(target, structuredClone(patch));
}

function stripPayload(value: OverlayState): OverlayState {
  const { prevFrame: _prevFrame, ...attention } = value.attention;
  return { ...value, attention } as OverlayState;
}

function overlayLabel(displayId: number): string {
  return `overlay-${displayId}`;
}

function sendTo(label: string, event: string, payload?: unknown): void {
  void emitTo(label, event, payload).catch(() => {
    // A disabled display intentionally has no overlay window.
  });
}

function broadcastState(): void {
  for (const display of state.displays) {
    sendTo(overlayLabel(display.id), 'state-update', stripPayload(effectiveFor(display.id)));
  }
  const id = configDisplayId();
  sendTo('config', 'state-update', stripPayload(id != null ? effectiveFor(id) : state));
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveSettings(extractSettings(state, displaySettings));
  }, 800);
}

async function detectDisplays(force = false): Promise<boolean> {
  const monitors = await invoke<NativeMonitor[]>('get_monitors');
  const signature = JSON.stringify(monitors);
  if (!force && signature === monitorSignature) return false;
  monitorSignature = signature;

  state.displays = monitors.map((monitor) => {
    const existing = state.displays.find((display) => display.id === monitor.id);
    return {
      id: monitor.id,
      label: monitor.label,
      bounds: monitor.bounds,
      enabled: existing?.enabled ?? true,
    };
  });
  seedDisplaySettings();
  if (configSelectedDisplayId == null) configSelectedDisplayId = firstDisplayId();
  console.log(`[Hronomancer] Detected ${monitors.length} display(s)`);
  return true;
}

async function syncOverlays(): Promise<void> {
  await invoke('sync_overlays', {
    displays: state.displays,
    effectsEnabled: state.effectsEnabled,
    bootComplete: state.bootComplete,
  });
  for (const display of state.displays) {
    sendTo(overlayLabel(display.id), 'display-info', {
      displayId: display.id,
      bounds: display.bounds,
    });
  }
}

interface TrayState {
  effectsEnabled: boolean;
  colorThemeId: string;
  glitchThemeId: string;
  displays: { id: number; label: string; enabled: boolean }[];
  updateStatus: UpdateStatus;
  updateVersion: string | null;
}

function rebuildTrayMenu(): void {
  const trayState: TrayState = {
    effectsEnabled: state.effectsEnabled,
    colorThemeId: state.colorTheme.id,
    glitchThemeId: state.glitchTheme,
    displays: state.displays.map(({ id, label, enabled }) => ({ id, label, enabled })),
    updateStatus,
    updateVersion,
  };
  void invoke('update_tray', { state: trayState });
  scheduleSave();
}

async function applyLoginItem(): Promise<void> {
  try {
    await invoke('set_autostart', { enabled: state.launchAtLogin });
  } catch (error) {
    console.error('[Hronomancer] Failed to set login item:', error);
  }
}

function togglePomodoro(): void {
  if (state.pomodoro.active) {
    state.pomodoro.active = false;
    state.pomodoro.phase = 'work';
    state.pomodoro.remainingSeconds = state.pomodoro.totalSeconds;
  } else {
    state.pomodoro.active = true;
    state.pomodoro.phase = 'work';
    state.pomodoro.remainingSeconds = state.pomodoroWorkMinutes * 60;
    state.pomodoro.totalSeconds = state.pomodoroWorkMinutes * 60;
  }
  broadcastState();
}

function updatePomodoro(): void {
  if (!state.pomodoro.active) return;
  state.pomodoro.remainingSeconds -= 1;
  if (state.pomodoro.remainingSeconds <= 0) {
    if (state.pomodoro.phase === 'work') {
      state.pomodoro.phase = 'break';
      state.pomodoro.remainingSeconds = state.pomodoroBreakMinutes * 60;
      state.pomodoro.totalSeconds = state.pomodoroBreakMinutes * 60;
      triggerNotification(
        'HRONOMANCER',
        `Break time! Take ${state.pomodoroBreakMinutes} minutes.`,
      );
    } else {
      state.pomodoro.phase = 'work';
      state.pomodoro.remainingSeconds = state.pomodoroWorkMinutes * 60;
      state.pomodoro.totalSeconds = state.pomodoroWorkMinutes * 60;
      triggerNotification('HRONOMANCER', 'Work session starting!');
    }
  }
  broadcastState();
}

function triggerNotification(title: string, body: string): void {
  state.notificationFlash = 1;
  broadcastState();
  void invoke('show_notification', { title, body });
}

let lastTaskDoneNotify = 0;
function notifyTaskDone(): void {
  if (!state.effectsEnabled || !state.attention.notifyOnComplete) return;
  const now = Date.now();
  if (now - lastTaskDoneNotify < 8000) return;
  lastTaskDoneNotify = now;
  void invoke('show_notification', {
    title: 'HRONOMANCER // TASK COMPLETE',
    body: 'A busy region on screen just went quiet — it looks finished.',
  });
}

function updateActivityLevel(): void {
  const now = Date.now();
  const timeSinceActivity = now - state.lastActivity;
  const recentKeystrokes = state.keystrokes.filter((key) => now - key.time < 2000).length;
  const mouseSpeed = Math.hypot(state.mouseVel.x, state.mouseVel.y);
  const activity =
    Math.max(0, 1 - timeSinceActivity / 5000) * 0.3 +
    Math.min(recentKeystrokes / 10, 1) * 0.4 +
    Math.min(mouseSpeed / 50, 1) * 0.3;
  state.activityLevel = state.activityLevel * 0.85 + activity * 0.15;
  if (state.notificationFlash > 0) {
    state.notificationFlash = Math.max(0, state.notificationFlash - 0.02);
  }
}

const PRESENCE_AWAY_MS = 120_000;
const BREAK_RESET_MS = 45_000;
const BREAK_DUE_MS = 20 * 60_000;
const BREAK_OVERDUE_MS = 30 * 60_000;
let workStreakStart = Date.now();

function updatePresence(): void {
  const now = Date.now();
  const idleMs = now - state.lastActivity;
  const active = idleMs < PRESENCE_AWAY_MS;
  if (idleMs > BREAK_RESET_MS) workStreakStart = now;
  const continuousActiveMs = active ? now - workStreakStart : 0;
  const breakLevel =
    continuousActiveMs > BREAK_OVERDUE_MS ? 2 : continuousActiveMs > BREAK_DUE_MS ? 1 : 0;
  state.presence = { idleMs, active, continuousActiveMs, breakLevel };
}

let previousMouse = { x: 0, y: 0 };
function handleNativeInput(input: NativeInput): void {
  const now = Date.now();
  state.lastActivity = now;

  if (input.kind === 'mouse' && input.x != null && input.y != null) {
    state.prevMouse = { ...state.mouse };
    state.mouseVel = {
      x: input.x - previousMouse.x,
      y: input.y - previousMouse.y,
      vx: input.x - previousMouse.x,
      vy: input.y - previousMouse.y,
    };
    state.mouse = {
      x: input.x,
      y: input.y,
      vx: state.mouseVel.x,
      vy: state.mouseVel.y,
    };
    previousMouse = { x: input.x, y: input.y };
    const payload: InputMouseData = {
      x: input.x,
      y: input.y,
      vx: state.mouseVel.x,
      vy: state.mouseVel.y,
    };
    for (const display of state.displays) {
      sendTo(overlayLabel(display.id), 'input-mouse', payload);
    }
  } else if (input.kind === 'key') {
    const keycode = [...(input.key ?? '')].reduce((hash, char) => hash + char.charCodeAt(0), 0);
    state.keystrokes.push({ key: keycode, time: now });
    if (state.keystrokes.length > 50) state.keystrokes.shift();
    const payload: InputKeyData = { keycode };
    for (const display of state.displays) {
      sendTo(overlayLabel(display.id), 'input-key', payload);
    }
  } else if (input.kind === 'click' && input.x != null && input.y != null) {
    const payload: InputClickData = {
      x: input.x,
      y: input.y,
      button: input.button ?? 1,
    };
    for (const display of state.displays) {
      sendTo(overlayLabel(display.id), 'input-click', payload);
    }
  }
}

async function updateSystemStats(): Promise<void> {
  try {
    const stats = await invoke<SystemStats>('get_system_stats');
    state.system.cpu = stats.cpu;
    state.system.ram = stats.ram;
    state.system.ramTotal = stats.ramTotal;
    state.system.uptime = stats.uptime;
  } catch {}
}

const SCREEN_SAMPLE_STEP = 2;
const SCREEN_WIDTH = 256;
const SCREEN_HEIGHT = 144;

async function analyzeDisplay(display: OverlayState['displays'][number]): Promise<boolean> {
  if (!state.effectsEnabled || !display.enabled) return false;
  try {
    const raw = await invoke<ArrayBuffer | number[]>('capture_monitor_screen', {
      bounds: display.bounds,
    });
    const pixels = raw instanceof ArrayBuffer ? new Uint8Array(raw) : Uint8Array.from(raw);
    if (pixels.length !== SCREEN_WIDTH * SCREEN_HEIGHT * 4) return false;
    const runtime = runtimeForDisplay(display.id);
    const previous = runtime.prevScreenData;
    const previousReady = !!previous && previous.length === pixels.length;
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalBrightness = 0;
    const halfWidth = Math.floor(SCREEN_WIDTH / 2);
    const halfHeight = Math.floor(SCREEN_HEIGHT / 2);
    const quadrants = [0, 0, 0, 0];
    const quadrantCounts = [0, 0, 0, 0];
    let motionSum = 0;
    let count = 0;

    for (let y = 0; y < SCREEN_HEIGHT; y += SCREEN_SAMPLE_STEP) {
      for (let x = 0; x < SCREEN_WIDTH; x += SCREEN_SAMPLE_STEP) {
        const index = (y * SCREEN_WIDTH + x) * 4;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        totalR += r;
        totalG += g;
        totalB += b;
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        totalBrightness += brightness;
        const quadrant = (y >= halfHeight ? 2 : 0) + (x >= halfWidth ? 1 : 0);
        quadrants[quadrant] += brightness;
        quadrantCounts[quadrant] += 1;
        if (previousReady) {
          motionSum +=
            (Math.abs(r - previous[index]) +
              Math.abs(g - previous[index + 1]) +
              Math.abs(b - previous[index + 2])) /
            (3 * 255);
        }
        count += 1;
      }
    }

    if (count === 0) return false;
    runtime.screen.brightness = totalBrightness / count;
    runtime.screen.dominantColor = [
      Math.round(totalR / count),
      Math.round(totalG / count),
      Math.round(totalB / count),
    ];
    runtime.screen.motion = Math.min((motionSum / count) * 10, 1);
    runtime.screen.regions = {
      topLeft: quadrants[0] / Math.max(1, quadrantCounts[0]),
      topRight: quadrants[1] / Math.max(1, quadrantCounts[1]),
      bottomLeft: quadrants[2] / Math.max(1, quadrantCounts[2]),
      bottomRight: quadrants[3] / Math.max(1, quadrantCounts[3]),
    };

    let pulse = { anyNew: false, anyChurning: false, anyComplete: false };
    if (runtime.attention.enabled) {
      pulse = analyzeScreenForAttention(
        pixels,
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        runtime.attention,
      );
      if (pulse.anyComplete) {
        state.lifetimeTasksDone += 1;
        notifyTaskDone();
      }
    }

    const copy = new Uint8Array(pixels);
    runtime.prevScreenData = copy;
    runtime.attention.prevFrame = copy;
    return (
      runtime.screen.motion > 0.03 ||
      pulse.anyNew ||
      pulse.anyChurning ||
      pulse.anyComplete
    );
  } catch {
    return false;
  }
}

const CAPTURE_BURST_MS = 2000;
const CAPTURE_INTERVALS: Record<PerformanceProfile, { idle: number; fast: number }> = {
  eco: { idle: 1000, fast: 250 },
  balanced: { idle: 500, fast: 120 },
  smooth: { idle: 250, fast: 80 },
};
let captureFastUntil = 0;

async function captureLoop(): Promise<void> {
  const results = await Promise.all(state.displays.map(analyzeDisplay));
  if (results.some(Boolean)) captureFastUntil = Date.now() + CAPTURE_BURST_MS;
  const cadence = CAPTURE_INTERVALS[state.performanceProfile];
  captureTimer = setTimeout(
    captureLoop,
    Date.now() < captureFastUntil ? cadence.fast : cadence.idle,
  );
}

async function applyConfig(config: SetConfigPayload): Promise<void> {
  const {
    attention,
    displays,
    effectsEnabled,
    targetDisplayId,
    applyToAll,
    launchAtLogin,
    pomodoroWorkMinutes,
    pomodoroBreakMinutes,
    performanceProfile,
  } = config;

  if (typeof effectsEnabled === 'boolean') state.effectsEnabled = effectsEnabled;
  if (typeof launchAtLogin === 'boolean') {
    state.launchAtLogin = launchAtLogin;
    void applyLoginItem();
  }
  if (typeof pomodoroWorkMinutes === 'number') {
    state.pomodoroWorkMinutes = Math.min(120, Math.max(1, Math.round(pomodoroWorkMinutes)));
  }
  if (typeof pomodoroBreakMinutes === 'number') {
    state.pomodoroBreakMinutes = Math.min(60, Math.max(1, Math.round(pomodoroBreakMinutes)));
  }
  if (
    performanceProfile === 'eco' ||
    performanceProfile === 'balanced' ||
    performanceProfile === 'smooth'
  ) {
    state.performanceProfile = performanceProfile;
  }
  if (Array.isArray(displays)) {
    for (const display of displays) {
      const existing = state.displays.find(({ id }) => id === display.id);
      if (existing) existing.enabled = !!display.enabled;
    }
  }
  if (attention && typeof attention === 'object') {
    if (typeof attention.enabled === 'boolean') state.attention.enabled = attention.enabled;
    if (typeof attention.mode === 'string') state.attention.mode = attention.mode as AttentionMode;
    if (typeof attention.sensitivity === 'number') {
      state.attention.sensitivity = attention.sensitivity;
    }
    if (typeof attention.notifyOnComplete === 'boolean') {
      state.attention.notifyOnComplete = attention.notifyOnComplete;
    }
  }

  const patch: Partial<DisplaySettings> = {};
  for (const key of DISPLAY_SETTING_KEYS) {
    const value = (config as Record<string, unknown>)[key];
    if (value !== undefined) (patch as Record<string, unknown>)[key] = value;
  }
  if (patch.glitchTheme !== undefined && !isGlitchThemeId(patch.glitchTheme)) {
    delete patch.glitchTheme;
  }
  if (patch.colorTheme !== undefined && typeof patch.colorTheme !== 'object') {
    delete patch.colorTheme;
  }
  if (patch.layout !== undefined) {
    const layout = patch.layout as Partial<HudLayout>;
    const normalized = {} as HudLayout;
    for (const key of HUD_LAYOUT_KEYS) {
      normalized[key] = normalizeHudPosition(layout[key], state.layout[key]);
    }
    patch.layout = normalized;
  }
  if (patch.glitchConfig !== undefined) {
    patch.glitchConfig = normalizeGlitchConfig(patch.glitchConfig);
  }

  applyDisplaySettings(
    patch,
    typeof targetDisplayId === 'number' ? targetDisplayId : null,
    !!applyToAll,
  );
  rebuildTrayMenu();
  await syncOverlays();
  broadcastState();
}

function setPomodoroWork(minutes: number): void {
  state.pomodoroWorkMinutes = Math.min(120, Math.max(1, Math.round(minutes)));
  if (!state.pomodoro.active) {
    state.pomodoro.totalSeconds = state.pomodoroWorkMinutes * 60;
    state.pomodoro.remainingSeconds = state.pomodoroWorkMinutes * 60;
  }
  broadcastState();
}

function setPomodoroBreak(minutes: number): void {
  state.pomodoroBreakMinutes = Math.min(60, Math.max(1, Math.round(minutes)));
  if (state.pomodoro.active && state.pomodoro.phase === 'break') {
    state.pomodoro.totalSeconds = state.pomodoroBreakMinutes * 60;
    state.pomodoro.remainingSeconds = state.pomodoroBreakMinutes * 60;
  }
  broadcastState();
}

async function checkForUpdates(manual = false): Promise<void> {
  if (updateStatus === 'checking' || updateStatus === 'downloading') return;
  updateStatus = 'checking';
  rebuildTrayMenu();
  try {
    const version = await invoke<string | null>('check_for_update');
    if (version) {
      updateStatus = 'available';
      updateVersion = version;
      triggerNotification(
        'HRONOMANCER // UPDATE AVAILABLE',
        `Version ${version} is available. Use the tray menu to download it.`,
      );
    } else {
      updateStatus = 'idle';
      updateVersion = null;
      if (manual) {
        const currentVersion = await invoke<string>('app_version');
        triggerNotification(
          'HRONOMANCER // UP TO DATE',
          `You are running the latest version (${currentVersion}).`,
        );
      }
    }
  } catch (error) {
    updateStatus = 'idle';
    updateVersion = null;
    console.error('[Hronomancer] Update check failed:', error);
    if (manual) {
      triggerNotification(
        'HRONOMANCER // UPDATE ERROR',
        'The update check failed. Please try again later.',
      );
    }
  }
  rebuildTrayMenu();
}

async function downloadUpdate(): Promise<void> {
  if (updateStatus !== 'available') return;
  updateStatus = 'downloading';
  rebuildTrayMenu();
  try {
    await invoke('download_and_install_update');
    updateStatus = 'downloaded';
    triggerNotification(
      'HRONOMANCER // UPDATE READY',
      `Version ${updateVersion ?? ''} is ready. Restart from the tray menu to install it.`,
    );
  } catch (error) {
    console.error('[Hronomancer] Update download failed:', error);
    updateStatus = 'available';
    triggerNotification(
      'HRONOMANCER // UPDATE ERROR',
      'The update download failed. Please try again later.',
    );
  }
  rebuildTrayMenu();
}

async function handleNativeAction(action: string): Promise<void> {
  if (action === 'effects-toggle') {
    state.effectsEnabled = !state.effectsEnabled;
  } else if (action === 'config-toggle' || action === 'config-open') {
    await invoke('toggle_config_window');
    return;
  } else if (action === 'pomodoro-toggle') {
    togglePomodoro();
    return;
  } else if (action === 'theme-next') {
    const index = THEMES.findIndex((theme) => theme.id === state.colorTheme.id);
    applyDisplaySettings({ colorTheme: THEMES[(index + 1) % THEMES.length] }, null, true);
  } else if (action === 'glitch-next') {
    const index = GLITCH_THEMES.findIndex((theme) => theme.id === state.glitchTheme);
    applyDisplaySettings(
      { glitchTheme: GLITCH_THEMES[(index + 1) % GLITCH_THEMES.length].id },
      null,
      true,
    );
  } else if (action.startsWith('theme:')) {
    const theme = THEMES.find(({ id }) => id === action.slice(6));
    if (theme) applyDisplaySettings({ colorTheme: theme }, null, true);
  } else if (action.startsWith('glitch:')) {
    const glitchTheme = action.slice(7);
    if (isGlitchThemeId(glitchTheme)) {
      applyDisplaySettings({ glitchTheme }, null, true);
    }
  } else if (action.startsWith('display:')) {
    const displayId = Number(action.slice(8));
    const display = state.displays.find(({ id }) => id === displayId);
    if (display) display.enabled = !display.enabled;
  } else if (action.startsWith('intensity:')) {
    applyDisplaySettings({ intensity: Number(action.slice(10)) }, null, true);
  } else if (action === 'update-check') {
    await checkForUpdates(true);
    return;
  } else if (action === 'update-download') {
    await downloadUpdate();
    return;
  } else if (action === 'update-restart') {
    await invoke('restart_app');
    return;
  } else if (action === 'update-releases') {
    await invoke('open_external', { url: RELEASES_URL });
    return;
  } else if (action === 'quit') {
    await invoke('quit_app');
    return;
  } else {
    return;
  }

  rebuildTrayMenu();
  await syncOverlays();
  broadcastState();
}

function registerEvents(): void {
  void listen<NativeInput>('native-input', ({ payload }) => handleNativeInput(payload));
  void listen<string>('native-action', ({ payload }) => {
    void handleNativeAction(payload);
  });
  void listen<string>('state-request', ({ payload: label }) => {
    if (label.startsWith('overlay-')) {
      const id = Number(label.slice(8));
      sendTo(label, 'state-update', stripPayload(effectiveFor(id)));
      const display = state.displays.find((candidate) => candidate.id === id);
      if (display) {
        sendTo(label, 'display-info', { displayId: id, bounds: display.bounds });
      }
    } else {
      const id = configDisplayId();
      sendTo(label, 'state-update', stripPayload(id != null ? effectiveFor(id) : state));
    }
  });
  void listen<SetConfigPayload>('set-config', ({ payload }) => {
    void applyConfig(payload);
  });
  void listen<number>('select-display', ({ payload }) => {
    if (typeof payload === 'number') configSelectedDisplayId = payload;
    const id = configDisplayId();
    sendTo('config', 'state-update', stripPayload(id != null ? effectiveFor(id) : state));
  });
  void listen('start-pomodoro', togglePomodoro);
  void listen<number>('set-pomodoro-work', ({ payload }) => setPomodoroWork(payload));
  void listen<number>('set-pomodoro-break', ({ payload }) => setPomodoroBreak(payload));
}

async function initialize(): Promise<void> {
  console.log('[Hronomancer] Tauri controller starting...');
  registerEvents();

  const persisted = await loadSettings();
  if (persisted) {
    applySettings(state, displaySettings, persisted);
    console.log('[Hronomancer] Loaded saved settings');
  }

  await applyLoginItem();
  await detectDisplays(true);
  rebuildTrayMenu();
  await syncOverlays();
  broadcastState();
  await invoke('start_native_services');

  setInterval(updateActivityLevel, 100);
  setInterval(updatePresence, 1000);
  setInterval(() => void updateSystemStats(), 2000);
  setInterval(updatePomodoro, 1000);
  setInterval(() => {
    if (!state.bootComplete && Date.now() - bootStartTime > 3000) {
      state.bootComplete = true;
      void syncOverlays();
      broadcastState();
    }
  }, 500);
  setInterval(broadcastState, 200);
  setInterval(() => {
    void detectDisplays().then((changed) => {
      if (!changed) return;
      rebuildTrayMenu();
      void syncOverlays();
      broadcastState();
    });
  }, 2000);

  void updateSystemStats();
  void captureLoop();
  setTimeout(() => void checkForUpdates(), 3000);
  console.log('[Hronomancer] Tauri controller ready');
}

void initialize();
