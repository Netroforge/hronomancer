import { invoke } from '@tauri-apps/api/core';
import type {
  OverlayState,
  AttentionMode,
  DisplaySettings,
  PerformanceProfile,
} from '../shared/types';
import {
  THEMES,
  createDefaultState,
  extractDisplaySettings,
  cloneDisplaySettings,
  normalizeHudPosition,
  normalizeGlitchConfig,
  isGlitchThemeId,
  DISPLAY_SETTING_KEYS,
  HUD_LAYOUT_KEYS,
} from '../shared/types';

// A display's settings on disk. Same as the runtime DisplaySettings but the
// colour theme is stored by id (resilient, compact) rather than as an object.
export type PersistedDisplaySettings = Omit<DisplaySettings, 'colorTheme'> & { colorThemeId: string };

// Only user-facing settings are persisted — never volatile runtime fields
// (mouse, keystrokes, screen/audio analysis, presence, pomodoro countdown).
// Settings are per-display, plus a `defaults` template new displays inherit and
// the global master toggle + attention analysis config.
export interface PersistedSettings {
  effectsEnabled: boolean;
  attention: { enabled: boolean; mode: AttentionMode; sensitivity: number; notifyOnComplete: boolean };
  lifetimeTasksDone: number;
  defaults: PersistedDisplaySettings;
  displays: { id: number; enabled: boolean; settings: PersistedDisplaySettings }[];
  launchAtLogin: boolean;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  performanceProfile: PerformanceProfile;
}

export async function loadSettings(): Promise<Partial<PersistedSettings> | null> {
  try {
    const raw = await invoke<string | null>('load_settings');
    if (!raw) return null;
    return JSON.parse(raw) as Partial<PersistedSettings>;
  } catch {
    return null; // no file yet or unreadable — fall back to defaults
  }
}

export async function saveSettings(settings: PersistedSettings): Promise<void> {
  try {
    await invoke('save_settings', { json: JSON.stringify(settings, null, 2) });
  } catch (err) {
    console.error('[Hronomancer] Failed to save settings:', err);
  }
}

function toPersisted(ds: DisplaySettings): PersistedDisplaySettings {
  const { colorTheme, ...rest } = ds;
  return { ...(JSON.parse(JSON.stringify(rest)) as Omit<DisplaySettings, 'colorTheme'>), colorThemeId: colorTheme.id };
}

// Resolve a persisted display-settings record back into runtime DisplaySettings,
// starting from the current defaults so newly-added fields get sane values and
// malformed persisted data is ignored.
function fromPersisted(p: Partial<PersistedDisplaySettings> | undefined, base: DisplaySettings): DisplaySettings {
  const ds = cloneDisplaySettings(base);
  if (!p || typeof p !== 'object') return ds;

  for (const k of DISPLAY_SETTING_KEYS) {
    if (k === 'layout' || k === 'colorTheme' || k === 'glitchTheme' || k === 'glitchConfig') continue;
    const v = (p as Record<string, unknown>)[k];
    if (typeof v === typeof (ds as Record<string, unknown>)[k]) (ds as Record<string, unknown>)[k] = v;
  }
  if (p.colorThemeId) {
    const t = THEMES.find((x) => x.id === p.colorThemeId);
    if (t) ds.colorTheme = t;
  }
  if (isGlitchThemeId(p.glitchTheme)) ds.glitchTheme = p.glitchTheme;
  if (p.glitchConfig) ds.glitchConfig = normalizeGlitchConfig(p.glitchConfig);
  if (p.layout && typeof p.layout === 'object') {
    for (const key of HUD_LAYOUT_KEYS) ds.layout[key] = normalizeHudPosition(p.layout[key], ds.layout[key]);
  }
  return ds;
}

export function extractSettings(state: OverlayState, displaySettings: Map<number, DisplaySettings>): PersistedSettings {
  const defaults = extractDisplaySettings(state);
  return {
    effectsEnabled: state.effectsEnabled,
    attention: {
      enabled: state.attention.enabled,
      mode: state.attention.mode,
      sensitivity: state.attention.sensitivity,
      notifyOnComplete: state.attention.notifyOnComplete,
    },
    lifetimeTasksDone: state.lifetimeTasksDone,
    launchAtLogin: state.launchAtLogin,
    pomodoroWorkMinutes: state.pomodoroWorkMinutes,
    pomodoroBreakMinutes: state.pomodoroBreakMinutes,
    performanceProfile: state.performanceProfile,
    defaults: toPersisted(defaults),
    displays: state.displays.map((d) => ({
      id: d.id,
      enabled: d.enabled,
      settings: toPersisted(displaySettings.get(d.id) ?? defaults),
    })),
  };
}

// Mutates `state` (the default template + globals) and fills `displaySettings`
// with any valid persisted values. Called at startup BEFORE detectDisplays() so
// the persisted per-display choices survive the display re-detection.
export function applySettings(
  state: OverlayState,
  displaySettings: Map<number, DisplaySettings>,
  s: Partial<PersistedSettings>,
): void {
  const base = extractDisplaySettings(createDefaultState());

  if (typeof s.effectsEnabled === 'boolean') state.effectsEnabled = s.effectsEnabled;

  if (s.attention) {
    if (typeof s.attention.enabled === 'boolean') state.attention.enabled = s.attention.enabled;
    if (s.attention.mode) state.attention.mode = s.attention.mode;
    if (typeof s.attention.sensitivity === 'number') state.attention.sensitivity = s.attention.sensitivity;
    if (typeof s.attention.notifyOnComplete === 'boolean') state.attention.notifyOnComplete = s.attention.notifyOnComplete;
  }

  if (typeof s.lifetimeTasksDone === 'number') state.lifetimeTasksDone = s.lifetimeTasksDone;

  if (typeof s.launchAtLogin === 'boolean') state.launchAtLogin = s.launchAtLogin;
  if (typeof s.pomodoroWorkMinutes === 'number') {
    state.pomodoroWorkMinutes = Math.min(120, Math.max(1, Math.round(s.pomodoroWorkMinutes)));
  }
  if (typeof s.pomodoroBreakMinutes === 'number') {
    state.pomodoroBreakMinutes = Math.min(60, Math.max(1, Math.round(s.pomodoroBreakMinutes)));
  }
  if (s.performanceProfile === 'eco' || s.performanceProfile === 'balanced' || s.performanceProfile === 'smooth') {
    state.performanceProfile = s.performanceProfile;
  }

  // Restore the default template onto `state`'s settings fields.
  const defaults = fromPersisted(s.defaults, base);
  Object.assign(state, cloneDisplaySettings(defaults));

  // Restore per-display settings + placeholder display entries. detectDisplays()
  // rebuilds bounds/labels and preserves the enabled flag for matching ids.
  if (Array.isArray(s.displays)) {
    state.displays = s.displays.map((d) => ({
      id: d.id,
      label: `Display ${d.id}`,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      enabled: !!d.enabled,
    }));
    for (const d of s.displays) {
      displaySettings.set(d.id, fromPersisted(d.settings, defaults));
    }
  }
}
