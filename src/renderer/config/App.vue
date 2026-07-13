<script setup lang="ts">
import { onMounted, computed } from 'vue';
import type { CyberAPI, HudSide, DisplayInfo } from '../shared/types';
import { THEMES, GLITCH_THEMES, GLITCH_PARAMS } from '../shared/types';
import { useOverlayStore } from './store';

type LayoutKey = 'clock' | 'statsHud' | 'pomodoro' | 'status' | 'sysTag' | 'signalLog' | 'sessionTime';

// Positionable HUD panels and the edges they can hug. Kept as data so the
// layout picker is a single v-for rather than repeated markup. The offset slider
// then slides a panel along its chosen side, between the two corners.
const LAYOUT_ELEMENTS: { key: LayoutKey; label: string }[] = [
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

const SIDES: { key: HudSide; label: string }[] = [
  { key: 'top', label: 'TOP' },
  { key: 'bottom', label: 'BOT' },
  { key: 'left', label: 'LEFT' },
  { key: 'right', label: 'RIGHT' },
];

declare global {
  interface Window {
    cyberAPI: CyberAPI;
  }
}

// Pinia store: holds the settings, owns the IPC sync + edit-suppression logic.
// The template binds to `config.*` directly (Pinia exposes state as instance
// properties), so markup is unchanged from the old local-ref version.
const config = useOverlayStore();

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

function sync(): void {
  config.sync();
}

function toggleMaster(): void {
  config.toggleMaster();
}

function closeWindow(): void {
  window.cyberAPI?.closeWindow();
}

function toggleDisplay(displayId: number): void {
  config.toggleDisplay(displayId);
}

function setColorTheme(colorThemeId: string): void {
  config.setColorTheme(colorThemeId);
}

function setGlitchTheme(glitchThemeId: string): void {
  config.setGlitchTheme(glitchThemeId);
}

// ── Per-display editing ──
function selectDisplay(id: number): void {
  config.selectDisplay(id);
}
function applyToAll(): void {
  config.applyToAllDisplays();
}
function displayTabLabel(d: DisplayInfo): string {
  return `${d.bounds.width}×${d.bounds.height}`;
}

// ── Granular per-theme glitch config ──
const glitchParams = computed(() => GLITCH_PARAMS[config.glitchThemeId] ?? []);
function paramEnabled(key: string): boolean {
  return config.glitchConfig[config.glitchThemeId]?.[key]?.enabled ?? true;
}
function paramIntensity(key: string): number {
  return config.glitchConfig[config.glitchThemeId]?.[key]?.intensity ?? 1;
}
function toggleParam(key: string): void {
  config.setGlitchParam(config.glitchThemeId, key, { enabled: !paramEnabled(key) });
}
function setParamIntensity(key: string, v: number): void {
  config.setGlitchParam(config.glitchThemeId, key, { intensity: v });
}

function setSide(element: LayoutKey, side: HudSide): void {
  config.layout[element].side = side;
  sync();
}

function setOffset(element: LayoutKey, offset: number): void {
  config.layout[element].offset = offset;
  sync();
}

function startPomodoro(): void {
  window.cyberAPI?.startPomodoro();
}

function openSupport(): void {
  window.cyberAPI?.openExternal(SUPPORT_URL);
}

function onTitlebarMouseDown(e: MouseEvent): void {
  isDragging = true;
  lastMouseX = e.screenX;
  lastMouseY = e.screenY;
}

function onMouseMove(e: MouseEvent): void {
  if (!isDragging) return;
  const offsetX = e.screenX - lastMouseX;
  const offsetY = e.screenY - lastMouseY;
  lastMouseX = e.screenX;
  lastMouseY = e.screenY;
  window.cyberAPI?.windowMove(offsetX, offsetY);
}

function onMouseUp(): void {
  isDragging = false;
}

onMounted(() => {
  config.init();
});
</script>

<template>
  <div class="config-panel" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseUp">
    <div class="titlebar" @mousedown="onTitlebarMouseDown">
      <h1>/// HRONOMANCER ///</h1>
      <button class="close-btn" @click.stop="closeWindow">X</button>
    </div>
    <div class="content">
      <div
        class="master-toggle"
        :class="config.effectsEnabled ? 'on' : 'off'"
        @click="toggleMaster"
      >
        <span>{{ config.effectsEnabled ? '[ SYSTEM: ACTIVE ]' : '[ SYSTEM: OFFLINE ]' }}</span>
      </div>

      <div class="section" v-if="config.displays.length > 1">
        <div class="section-title">/// EDITING DISPLAY ///</div>
        <div class="display-tabs">
          <div
            v-for="(d, i) in config.displays"
            :key="d.id"
            class="display-tab"
            :class="{ active: config.selectedDisplayId === d.id }"
            @click="selectDisplay(d.id)"
          >
            <span class="dt-num">D{{ i + 1 }}</span>
            <span class="dt-res">{{ displayTabLabel(d) }}</span>
          </div>
        </div>
        <button class="apply-all-btn" @click="applyToAll">⇱ APPLY TO ALL DISPLAYS</button>
        <div class="info-text">Theme, effects, widgets and glitch settings below apply to the selected display.</div>
      </div>

      <div class="section">
        <div class="section-title">/// COLOR THEME ///</div>
        <div class="theme-grid">
          <div
            v-for="theme in THEMES"
            :key="theme.id"
            class="theme-card"
            :class="{ active: config.colorThemeId === theme.id }"
            @click="setColorTheme(theme.id)"
          >
            <div class="theme-preview">
              <span class="tp" :style="{ background: theme.colors.primary }"></span>
              <span class="tp" :style="{ background: theme.colors.secondary }"></span>
              <span class="tp" :style="{ background: theme.colors.accent }"></span>
            </div>
            <span class="theme-name">{{ theme.name }}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">/// GLITCH STYLE ///</div>
        <div class="theme-grid">
          <div
            v-for="glitch in GLITCH_THEMES"
            :key="glitch.id"
            class="theme-card"
            :class="{ active: config.glitchThemeId === glitch.id }"
            @click="setGlitchTheme(glitch.id)"
          >
            <div class="theme-preview">
              <span class="tp" :style="{ background: glitch.swatch[0] }"></span>
              <span class="tp" :style="{ background: glitch.swatch[1] }"></span>
              <span class="tp" :style="{ background: glitch.swatch[2] }"></span>
            </div>
            <span class="theme-name">{{ glitch.name }}</span>
          </div>
        </div>

        <div class="glitch-params">
          <div class="glitch-params-title">TUNE: {{ GLITCH_THEMES.find(g => g.id === config.glitchThemeId)?.name }}</div>
          <div v-for="p in glitchParams" :key="p.key" class="glitch-param">
            <div class="toggle-row">
              <label>{{ p.label }}</label>
              <div class="toggle" :class="{ active: paramEnabled(p.key) }" @click="toggleParam(p.key)" />
            </div>
            <div class="slider-row" v-if="paramEnabled(p.key)">
              <label>Intensity <span class="value">{{ paramIntensity(p.key).toFixed(1) }}×</span></label>
              <input
                type="range" min="0" max="2" step="0.1"
                :value="paramIntensity(p.key)"
                @input="setParamIntensity(p.key, parseFloat(($event.target as HTMLInputElement).value))"
              >
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">/// EFFECTS ///</div>

        <div class="toggle-row">
          <label><span class="color-tag" :style="{ background: THEMES.find(t => t.id === config.colorThemeId)?.colors.primary }"></span>Scanlines</label>
          <div class="toggle" :class="{ active: config.showScanlines }" @click="config.showScanlines = !config.showScanlines; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag" :style="{ background: THEMES.find(t => t.id === config.colorThemeId)?.colors.secondary }"></span>Glitch Blocks</label>
          <div class="toggle" :class="{ active: config.showGlitches }" @click="config.showGlitches = !config.showGlitches; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag" :style="{ background: THEMES.find(t => t.id === config.colorThemeId)?.colors.accent }"></span>Cursor Trail</label>
          <div class="toggle" :class="{ active: config.showCursorTrail }" @click="config.showCursorTrail = !config.showCursorTrail; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag pink"></span>Target Highlight</label>
          <div class="toggle" :class="{ active: config.showTargetHighlight }" @click="config.showTargetHighlight = !config.showTargetHighlight; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag cyan"></span>Clock</label>
          <div class="toggle" :class="{ active: config.showClock }" @click="config.showClock = !config.showClock; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag green"></span>System Stats</label>
          <div class="toggle" :class="{ active: config.showStatsHud }" @click="config.showStatsHud = !config.showStatsHud; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag purple"></span>Pomodoro Timer</label>
          <div class="toggle" :class="{ active: config.showPomodoro }" @click="config.showPomodoro = !config.showPomodoro; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag cyan"></span>Audio Visualizer <span class="mic-note">(mic)</span></label>
          <div class="toggle" :class="{ active: config.showAudioViz }" @click="config.showAudioViz = !config.showAudioViz; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag cyan"></span>Status Readout <span class="mic-note">(ACT/INT/POS)</span></label>
          <div class="toggle" :class="{ active: config.showStatus }" @click="config.showStatus = !config.showStatus; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag pink"></span>System Tag <span class="mic-note">(SYS/NODE)</span></label>
          <div class="toggle" :class="{ active: config.showSysTag }" @click="config.showSysTag = !config.showSysTag; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag cyan"></span>Edge Glow <span class="mic-note">(frame)</span></label>
          <div class="toggle" :class="{ active: config.showEdgeGlow }" @click="config.showEdgeGlow = !config.showEdgeGlow; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag purple"></span>Vignette</label>
          <div class="toggle" :class="{ active: config.showVignette }" @click="config.showVignette = !config.showVignette; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag green"></span>Activity Bar <span class="mic-note">(cursor)</span></label>
          <div class="toggle" :class="{ active: config.showActivityBar }" @click="config.showActivityBar = !config.showActivityBar; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag yellow"></span>Color Flash <span class="mic-note">(bright screen)</span></label>
          <div class="toggle" :class="{ active: config.showColorFlash }" @click="config.showColorFlash = !config.showColorFlash; sync()" />
        </div>

        <div class="toggle-row">
          <label><span class="color-tag pink"></span>Notification Flash</label>
          <div class="toggle" :class="{ active: config.showNotificationFlash }" @click="config.showNotificationFlash = !config.showNotificationFlash; sync()" />
        </div>
      </div>

      <div class="section">
        <div class="section-title">/// AMBIENT INTELLIGENCE ///</div>

        <div class="toggle-row">
          <label><span class="color-tag green"></span>System Load Glow <span class="mic-note">(cpu/ram)</span></label>
          <div class="toggle" :class="{ active: config.systemLoadGlow }" @click="config.systemLoadGlow = !config.systemLoadGlow; sync()" />
        </div>
        <div class="info-text">Edge glow shifts calm→amber→red and glitches rise as the machine works harder.</div>

        <div class="toggle-row">
          <label><span class="color-tag cyan"></span>Focus Ring</label>
          <div class="toggle" :class="{ active: config.showFocusRing }" @click="config.showFocusRing = !config.showFocusRing; sync()" />
        </div>
        <div class="info-text">Screen-edge progress arc: pomodoro time left, otherwise the current hour.</div>

        <div class="toggle-row">
          <label><span class="color-tag yellow"></span>Break Reminders <span class="mic-note">(20-20-20)</span></label>
          <div class="toggle" :class="{ active: config.breakReminders }" @click="config.breakReminders = !config.breakReminders; sync()" />
        </div>
        <div class="info-text">After ~20 min continuous work, a gentle cue to look 20ft away and stretch.</div>

        <div class="toggle-row">
          <label><span class="color-tag cyan"></span>Screen Time <span class="mic-note">(session)</span></label>
          <div class="toggle" :class="{ active: config.showSessionTime }" @click="config.showSessionTime = !config.showSessionTime; sync()" />
        </div>
        <div class="info-text">A calm, always-visible readout of how long you've been at the screen unbroken — it warms in colour as a session runs long. Fights time-blindness without a single popup.</div>

        <div class="toggle-row">
          <label><span class="color-tag purple"></span>Presence Dimming</label>
          <div class="toggle" :class="{ active: config.presenceDimming }" @click="config.presenceDimming = !config.presenceDimming; sync()" />
        </div>
        <div class="info-text">Overlay calms and fades when you step away; wakes the moment you return.</div>
      </div>

      <div class="section">
        <div class="section-title">/// LAYOUT ///</div>
        <div v-for="el in LAYOUT_ELEMENTS" :key="el.key" class="layout-item">
          <div class="layout-head">
            <label>{{ el.label }}</label>
            <div class="side-grid">
              <div
                v-for="side in SIDES"
                :key="side.key"
                class="side-btn"
                :class="{ active: config.layout[el.key].side === side.key }"
                @click="setSide(el.key, side.key)"
              >{{ side.label }}</div>
            </div>
          </div>
          <div class="slider-row">
            <label>
              Position along {{ config.layout[el.key].side }}
              <span class="value">{{ Math.round(config.layout[el.key].offset * 100) }}%</span>
            </label>
            <input
              type="range" min="0" max="1" step="0.1"
              :value="config.layout[el.key].offset"
              @input="setOffset(el.key, parseFloat(($event.target as HTMLInputElement).value))"
            >
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">/// PARAMETERS ///</div>

        <div class="slider-row">
          <label>Master Intensity <span class="value">{{ (config.intensity * 100).toFixed(0) }}%</span></label>
          <input type="range" min="0" max="1" step="0.05" :value="config.intensity" @input="config.intensity = parseFloat(($event.target as HTMLInputElement).value); sync()">
        </div>

        <div class="slider-row">
          <label>Glitch Frequency <span class="value">{{ (config.glitchFrequency * 100).toFixed(1) }}%</span></label>
          <input type="range" min="0.005" max="0.1" step="0.005" :value="config.glitchFrequency" @input="config.glitchFrequency = parseFloat(($event.target as HTMLInputElement).value); sync()">
        </div>
      </div>

      <div class="section">
        <div class="section-title">/// POMODORO ///</div>
        <div v-if="config.pomodoro.active" class="pomodoro-status">
          <span class="pomodoro-phase">{{ config.pomodoro.phase === 'work' ? 'WORK' : 'BREAK' }}</span>
          <span class="pomodoro-time">{{ Math.floor(config.pomodoro.remainingSeconds / 60) }}:{{ String(config.pomodoro.remainingSeconds % 60).padStart(2, '0') }}</span>
          <button class="pomodoro-btn" @click="startPomodoro">STOP</button>
        </div>
        <button v-else class="pomodoro-btn start" @click="startPomodoro">START 25 MIN</button>
      </div>

      <div class="section">
        <div class="section-title">/// SCREEN ATTENTION ///</div>

        <div class="toggle-row">
          <label><span class="color-tag pink"></span>Attention Detection</label>
          <div class="toggle" :class="{ active: config.attentionEnabled }" @click="config.attentionEnabled = !config.attentionEnabled; sync()" />
        </div>

        <div v-if="config.attentionEnabled">
          <div class="slider-row">
            <label>Sensitivity <span class="value">{{ (config.attentionSensitivity * 100).toFixed(0) }}%</span></label>
            <input type="range" min="0.1" max="1" step="0.05" :value="config.attentionSensitivity" @input="config.attentionSensitivity = parseFloat(($event.target as HTMLInputElement).value); sync()">
          </div>

          <div class="mode-grid">
            <div class="mode-btn" :class="{ active: config.attentionMode === 'auto' }" @click="config.attentionMode = 'auto'; sync()">AUTO</div>
            <div class="mode-btn" :class="{ active: config.attentionMode === 'notification' }" @click="config.attentionMode = 'notification'; sync()">NOTIF</div>
            <div class="mode-btn" :class="{ active: config.attentionMode === 'motion' }" @click="config.attentionMode = 'motion'; sync()">MOTION</div>
            <div class="mode-btn" :class="{ active: config.attentionMode === 'contrast' }" @click="config.attentionMode = 'contrast'; sync()">CONTRAST</div>
            <div class="mode-btn" :class="{ active: config.attentionMode === 'color' }" @click="config.attentionMode = 'color'; sync()">COLOR</div>
          </div>

          <div class="attention-info">
            <div v-if="config.attentionMode === 'auto'" class="info-text">Detects all: notifications, motion, contrast shifts, color anomalies</div>
            <div v-else-if="config.attentionMode === 'notification'" class="info-text">Highlights bright popups and notification windows</div>
            <div v-else-if="config.attentionMode === 'motion'" class="info-text">Highlights regions with movement or animation</div>
            <div v-else-if="config.attentionMode === 'contrast'" class="info-text">Highlights high-contrast text areas and dialogs</div>
            <div v-else-if="config.attentionMode === 'color'" class="info-text">Highlights regions with unusual colors</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">/// SCREEN ASSIST ///</div>
        <div class="info-text" style="margin-bottom: 6px;">Effects that react to what's on screen. Analysis runs entirely in memory on your machine — nothing is recorded, stored, or sent anywhere.</div>

        <div class="toggle-row">
          <label><span class="color-tag green"></span>Alert When Task Done <span class="mic-note">(system + sound)</span></label>
          <div class="toggle" :class="{ active: config.attentionNotifyOnComplete }" @click="config.attentionNotifyOnComplete = !config.attentionNotifyOnComplete; sync()" />
        </div>
        <div class="info-text">Fires a real system notification the moment a long task (build, render, export, download) goes quiet — so you catch the finish even when Hronomancer isn't the focused window.</div>

        <div class="toggle-row">
          <label><span class="color-tag green"></span>Task-Done Pulse</label>
          <div class="toggle" :class="{ active: config.showTaskComplete }" @click="config.showTaskComplete = !config.showTaskComplete; sync()" />
        </div>
        <div class="info-text">On-screen ✓ pulse over the region that just finished.</div>

        <div class="toggle-row">
          <label><span class="color-tag cyan"></span>Signal Log</label>
          <div class="toggle" :class="{ active: config.showSignalLog }" @click="config.showSignalLog = !config.showSignalLog; sync()" />
        </div>
        <div class="info-text">Keeps a glanceable list of recent finishes & popups so the transient cues don't vanish — and recaps what happened while you were away.</div>

        <div class="toggle-row">
          <label><span class="color-tag pink"></span>Notification Radar</label>
          <div class="toggle" :class="{ active: config.showNotificationRadar }" @click="config.showNotificationRadar = !config.showNotificationRadar; sync()" />
        </div>
        <div class="info-text">A directional ping toward a popup that appears away from where you're working — so you don't miss it.</div>

        <div class="toggle-row">
          <label><span class="color-tag purple"></span>Focus Spotlight</label>
          <div class="toggle" :class="{ active: config.focusSpotlight }" @click="config.focusSpotlight = !config.focusSpotlight; sync()" />
        </div>
        <div v-if="config.focusSpotlight">
          <div class="slider-row">
            <label>Dim Strength <span class="value">{{ (config.focusDimStrength * 100).toFixed(0) }}%</span></label>
            <input type="range" min="0" max="1" step="0.05" :value="config.focusDimStrength" @input="config.focusDimStrength = parseFloat(($event.target as HTMLInputElement).value); sync()">
          </div>
          <div class="mode-grid">
            <div class="mode-btn" :class="{ active: config.focusTrigger === 'typing' }" @click="config.focusTrigger = 'typing'; sync()">WHILE TYPING</div>
            <div class="mode-btn" :class="{ active: config.focusTrigger === 'active' }" @click="config.focusTrigger = 'active'; sync()">WHILE ACTIVE</div>
          </div>
        </div>
        <div class="info-text">Dims the desktop periphery around your work locus (HazeOver-style). Note: it dims — a true background blur isn't possible for a transparent overlay.</div>

        <div class="toggle-row">
          <label><span class="color-tag cyan"></span>Cinema Mode</label>
          <div class="toggle" :class="{ active: config.cinemaMode }" @click="config.cinemaMode = !config.cinemaMode; sync()" />
        </div>
        <div class="info-text">Detects video playback and stops drawing effects over it, so the overlay never obstructs what you're watching.</div>
      </div>

      <div class="section">
        <div class="section-title">/// DISPLAYS ///</div>
        <div v-if="config.displays.length === 0" class="no-displays">No displays detected</div>
        <div v-for="display in config.displays" :key="display.id" class="toggle-row">
          <label>
            <span class="color-tag" :class="display.enabled ? 'green' : 'pink'"></span>
            Display {{ display.id }}
            <span class="display-res">{{ display.bounds.width }}x{{ display.bounds.height }}</span>
          </label>
          <div class="toggle" :class="{ active: display.enabled }" @click="toggleDisplay(display.id)" />
        </div>
      </div>

      <div class="section">
        <div class="section-title">/// SUPPORT ///</div>
        <div class="support-card">
          <div class="support-privacy">◈ 100% LOCAL · NO ACCOUNT · NO TRACKING · NOTHING STORED</div>
          <div class="support-line" v-if="config.lifetimeTasksDone > 0">
            Hronomancer has caught <b>{{ config.lifetimeTasksDone }}</b> finished task{{ config.lifetimeTasksDone === 1 ? '' : 's' }} for you.
          </div>
          <div class="support-line" v-else>
            Free and yours to keep. If it earns a place on your screen…
          </div>
          <button class="coffee-btn" @click="openSupport">☕ BUY ME A COFFEE</button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">/// HOTKEYS ///</div>
        <div class="hotkey-list">
          <div class="hotkey-row"><kbd>Ctrl+Alt+H</kbd> Toggle effects</div>
          <div class="hotkey-row"><kbd>Ctrl+Alt+T</kbd> Switch color theme</div>
          <div class="hotkey-row"><kbd>Ctrl+Alt+G</kbd> Switch glitch style</div>
          <div class="hotkey-row"><kbd>Ctrl+Alt+U</kbd> Open config</div>
          <div class="hotkey-row"><kbd>Ctrl+Alt+P</kbd> Pomodoro timer</div>
        </div>
      </div>

      <div class="stats">SYS://HRONOMANCER//NODE</div>
    </div>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

.config-panel {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  background: #0a0a0a;
  color: #e0e0e0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
}

.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: #111;
  border-bottom: 1px solid rgba(5, 217, 232, 0.2);
  cursor: grab;
  user-select: none;
}
.titlebar:active { cursor: grabbing; }

.titlebar h1 {
  font-size: 13px;
  color: #05d9e8;
  letter-spacing: 2px;
}

.close-btn {
  background: none;
  border: 1px solid rgba(255, 42, 109, 0.27);
  color: #ff2a6d;
  font-family: monospace;
  font-size: 14px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover { background: rgba(255, 42, 109, 0.13); border-color: #ff2a6d; }

.content {
  padding: 12px;
  height: calc(100vh - 38px);
  overflow-y: auto;
}
.content::-webkit-scrollbar { width: 4px; }
.content::-webkit-scrollbar-track { background: #111; }
.content::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

.section { margin-bottom: 14px; }

.section-title {
  font-size: 9px;
  letter-spacing: 3px;
  color: #05d9e8;
  text-transform: uppercase;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(5, 217, 232, 0.13);
  padding-bottom: 3px;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.toggle-row label {
  font-size: 11px;
  color: #ccc;
  display: flex;
  align-items: center;
}

.color-tag {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}
.color-tag.cyan { background: #05d9e8; }
.color-tag.pink { background: #ff2a6d; }
.color-tag.green { background: #00ff41; }
.color-tag.purple { background: #d100d1; }
.color-tag.yellow { background: #faff00; }

.toggle {
  position: relative;
  width: 36px;
  height: 18px;
  background: #222;
  border: 1px solid #444;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s;
}
.toggle.active { background: rgba(5, 217, 232, 0.2); border-color: #05d9e8; }
.toggle::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  background: #555;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: all 0.2s;
}
.toggle.active::after { left: 20px; background: #05d9e8; }

.slider-row { padding: 6px 0; }
.slider-row label {
  font-size: 10px;
  color: #888;
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.slider-row .value { color: #05d9e8; }

input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: #222;
  border-radius: 2px;
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: #05d9e8;
  border-radius: 50%;
  cursor: pointer;
}

.master-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  margin-bottom: 12px;
  background: #111;
  border: 1px solid rgba(5, 217, 232, 0.2);
  cursor: pointer;
  transition: all 0.3s;
}
.master-toggle.on { border-color: #05d9e8; box-shadow: 0 0 15px rgba(5, 217, 232, 0.13); }
.master-toggle.off { border-color: rgba(255, 42, 109, 0.27); }
.master-toggle span { font-size: 11px; letter-spacing: 3px; }
.master-toggle.on span { color: #05d9e8; }
.master-toggle.off span { color: #ff2a6d; }

.theme-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
.theme-card {
  padding: 6px 8px;
  background: #111;
  border: 1px solid #222;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.theme-card:hover { border-color: #444; }
.theme-card.active { border-color: #05d9e8; background: rgba(5, 217, 232, 0.05); }
.theme-preview {
  display: flex;
  gap: 3px;
  justify-content: center;
  margin-bottom: 4px;
}
.tp {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
.theme-name {
  font-size: 8px;
  letter-spacing: 1px;
  color: #888;
}
.theme-card.active .theme-name { color: #05d9e8; }

.no-displays { font-size: 10px; color: #666; padding: 4px 0; }
.display-res { font-size: 9px; color: #666; margin-left: 6px; }

.mic-note { color: #555; font-size: 9px; margin-left: 4px; }

.layout-item {
  padding: 7px 0;
  border-bottom: 1px solid rgba(5, 217, 232, 0.06);
}
.layout-item:last-child { border-bottom: none; }
.layout-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.layout-head label { font-size: 11px; color: #ccc; }

/* Edge selector: which side the panel hugs. */
.side-grid { display: flex; gap: 3px; }
.side-btn {
  min-width: 34px;
  padding: 3px 6px;
  text-align: center;
  font-size: 8px;
  letter-spacing: 1px;
  background: #111;
  border: 1px solid #333;
  color: #777;
  cursor: pointer;
  font-family: monospace;
  transition: all 0.2s;
}
.side-btn:hover { border-color: #555; color: #ccc; }
.side-btn.active { border-color: #05d9e8; color: #05d9e8; background: rgba(5, 217, 232, 0.08); }
.layout-item .slider-row { padding: 4px 0 0; }
.layout-item .slider-row label { text-transform: capitalize; }

.mode-grid {
  display: flex;
  gap: 4px;
  margin: 6px 0;
  flex-wrap: wrap;
}
.mode-btn {
  padding: 4px 8px;
  font-size: 9px;
  letter-spacing: 1px;
  background: #111;
  border: 1px solid #333;
  color: #888;
  cursor: pointer;
  font-family: monospace;
  transition: all 0.2s;
}
.mode-btn:hover { border-color: #555; color: #ccc; }
.mode-btn.active { border-color: #05d9e8; color: #05d9e8; background: rgba(5, 217, 232, 0.05); }

.attention-info {
  margin-top: 4px;
}
.info-text {
  font-size: 9px;
  color: #555;
  font-style: italic;
}

.pomodoro-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.pomodoro-phase {
  font-size: 10px;
  letter-spacing: 2px;
  color: #05d9e8;
}
.pomodoro-time {
  font-size: 18px;
  font-weight: 700;
  color: #05d9e8;
}
.pomodoro-btn {
  background: none;
  border: 1px solid rgba(255, 42, 109, 0.4);
  color: #ff2a6d;
  font-family: monospace;
  font-size: 10px;
  padding: 4px 10px;
  cursor: pointer;
  letter-spacing: 1px;
}
.pomodoro-btn:hover { background: rgba(255, 42, 109, 0.1); }
.pomodoro-btn.start {
  border-color: rgba(0, 255, 65, 0.4);
  color: #00ff41;
  width: 100%;
  padding: 8px;
}
.pomodoro-btn.start:hover { background: rgba(0, 255, 65, 0.1); }

.hotkey-list { padding: 4px 0; }
.hotkey-row {
  font-size: 10px;
  color: #666;
  padding: 3px 0;
  display: flex;
  gap: 8px;
  align-items: center;
}
kbd {
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 2px 6px;
  font-size: 9px;
  color: #05d9e8;
  font-family: monospace;
  border-radius: 2px;
  min-width: 90px;
  text-align: center;
}

.stats {
  font-size: 8px;
  color: #333;
  text-align: center;
  padding: 6px;
  letter-spacing: 1px;
}

/* Support / donation card */
.support-card {
  border: 1px solid rgba(5, 217, 232, 0.2);
  background: #111;
  padding: 10px;
  text-align: center;
}
.support-privacy {
  font-size: 8px;
  letter-spacing: 1px;
  color: #00ff41;
  margin-bottom: 8px;
}
.support-line {
  font-size: 10px;
  color: #aaa;
  margin-bottom: 8px;
  line-height: 1.4;
}
.support-line b { color: #05d9e8; }
.coffee-btn {
  width: 100%;
  background: none;
  border: 1px solid rgba(250, 255, 0, 0.4);
  color: #faff00;
  font-family: monospace;
  font-size: 11px;
  letter-spacing: 2px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.coffee-btn:hover { background: rgba(250, 255, 0, 0.1); border-color: #faff00; }

/* Per-display editing */
.display-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}
.display-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 10px;
  background: #111;
  border: 1px solid #333;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}
.display-tab:hover { border-color: #555; color: #ccc; }
.display-tab.active { border-color: #05d9e8; color: #05d9e8; background: rgba(5, 217, 232, 0.06); }
.dt-num { font-size: 11px; font-weight: 700; letter-spacing: 1px; }
.dt-res { font-size: 8px; color: #666; }
.display-tab.active .dt-res { color: #05d9e8; }
.apply-all-btn {
  width: 100%;
  background: none;
  border: 1px solid rgba(5, 217, 232, 0.3);
  color: #05d9e8;
  font-family: monospace;
  font-size: 9px;
  letter-spacing: 1px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.apply-all-btn:hover { background: rgba(5, 217, 232, 0.1); border-color: #05d9e8; }

/* Granular glitch config */
.glitch-params {
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(5, 217, 232, 0.1);
}
.glitch-params-title {
  font-size: 9px;
  letter-spacing: 2px;
  color: #ff2a6d;
  margin-bottom: 6px;
}
.glitch-param {
  padding: 2px 0 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.glitch-param:last-child { border-bottom: none; }
.glitch-param .slider-row { padding: 2px 0 4px; }
</style>
