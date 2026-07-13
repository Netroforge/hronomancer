import type { OverlayState, SignalEvent } from '../../shared/types';
import type { TrailPoint } from './primitives';
import { spawnGlitches, type Glitch, type GlitchTrigger } from './glitches';
import { drawScanlines } from './scanlines';
import { drawCursorTrail, updateTrail } from './cursorTrail';
import { drawTargetHighlight } from './targetHighlight';
import { drawVignette, drawEdgeGlow, drawStatusHud, drawSysTag, drawActivityBar, type EdgeFlash } from './hud';
import { drawAudioVisualizer } from './audioVisualizer';
import { drawClock } from './clock';
import { drawStatsHud } from './statsHud';
import { drawBootAnimation } from './bootAnimation';
import { drawPomodoro } from './pomodoro';
import { drawNotificationFlash } from './notificationFlash';
import { drawAttentionHighlights } from './attentionHighlight';
import { drawFocusRing } from './focusRing';
import { drawBreakNudge } from './breakNudge';
import { drawTaskComplete, DONE_PULSE_MS, type DonePulse } from './taskComplete';
import { drawNotificationRadar, RADAR_PING_MS, type RadarPing } from './notificationRadar';
import { drawFocusSpotlight } from './focusSpotlight';
import { suppressVideoRegions } from './cinema';
import { drawSignalLog } from './signalLog';
import { drawSessionTime } from './sessionTime';
import { AudioCapture } from './audioCapture';

// How dim the overlay fades to when the user is away (0 = invisible, 1 = full).
const PRESENCE_DIM = 0.28;

// Hard ceiling on concurrent glitches so a burst of activity can't pile up an
// unbounded draw list (protects the frame budget); oldest are dropped first.
const MAX_GLITCHES = 90;

// Signal Log bounds: how many recent screen-assist events to retain, how long
// before an entry ages out, and how long the "while you were away" recap holds.
const MAX_SIGNAL_EVENTS = 8;
const SIGNAL_TTL = 10 * 60_000;
const RECAP_MS = 7000;

export class CyberEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private glitches: Glitch[] = [];
  private trail: TrailPoint[] = [];
  private lastGlitch = 0;
  private lastFrameTime = 0;
  private state: OverlayState;
  private audioCapture = new AudioCapture();
  // Mirrors whether the mic capture is currently running, so we only start/stop
  // (and prompt the OS) on an actual on↔off transition rather than every frame.
  private audioActive = false;
  // Eased 0..1 opacity multiplier for presence dimming (1 = present).
  private presenceAlpha = 1;
  // Per-side directional notification flash, decays each frame.
  private edgeFlash: EdgeFlash = { top: 0, right: 0, bottom: 0, left: 0 };
  // Attention-region ids we've already reacted to, per channel, so each event
  // fires exactly once. Pruned to live ids each frame to bound memory.
  private flashedIds = new Set<number>();
  private radarSeenIds = new Set<number>();
  private completedSeenIds = new Set<number>();
  // Active one-shot assist animations (task-done pulses, notification pings).
  private donePulses: DonePulse[] = [];
  private radarPings: RadarPing[] = [];
  // Retained log of recent screen-assist events (completions, popups) so the
  // transient cues above survive as something glanceable after they fade.
  private signalEvents: SignalEvent[] = [];
  // Presence-transition tracking for the "while you were away" recap.
  private wasActive = true;
  private awayStart = 0;
  private recapUntil = 0;
  // Eased focus-spotlight state: where you're working and how "in focus" you are.
  private focusX = 0;
  private focusY = 0;
  private focusInit = false;
  private focusStrength = 0;

  constructor(canvas: HTMLCanvasElement, state: OverlayState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = state;
    this.W = canvas.width;
    this.H = canvas.height;
    (this.state as any).trail = this.trail;
    this.state.audio = this.audioCapture.audio;
    // Defer starting capture until we've reconciled against the real (possibly
    // persisted-off) `showAudioViz` setting, so a user who disabled audio is
    // never prompted for the mic on launch.
    this.syncAudio();
    window.addEventListener('resize', () => {
      this.W = canvas.width;
      this.H = canvas.height;
    });
  }

  updateState(state: OverlayState): void {
    this.state = state;
    (this.state as any).trail = this.trail;
    // Broadcasts carry a zeroed `audio` field (the main process never fills
    // it); keep pointing at the renderer-owned live analysis instead.
    this.state.audio = this.audioCapture.audio;
    this.syncAudio();
  }

  // Bring the mic capture in line with the `showAudioViz` setting. Starting is
  // fire-and-forget: it falls back to a silent (hidden) visualizer if the mic
  // is unavailable or permission is denied.
  private syncAudio(): void {
    const want = this.state.showAudioViz;
    if (want && !this.audioActive) {
      this.audioActive = true;
      void this.audioCapture.start();
    } else if (!want && this.audioActive) {
      this.audioActive = false;
      this.audioCapture.stop();
    }
  }

  onMouseInput(x: number, y: number, vx: number, vy: number): void {
    this.state.mouse.x = x;
    this.state.mouse.y = y;
    this.state.mouseVel.x = vx;
    this.state.mouseVel.y = vy;
    updateTrail(this.trail, x, y, vx, vy, this.state.activityLevel, this.state.intensity);
  }

  onKeyInput(): void {
    // Typing spills theme-specific code/glyphs where the cursor is.
    if (this.state.showGlitches && Math.random() < 0.4 * this.state.intensity) {
      this.emitGlitches('key', this.state.mouse.x, this.state.mouse.y, 0.4);
    }
  }

  onClickInput(x: number, y: number): void {
    // A click is an impact at a point — themes render a localized burst/lock-on.
    this.emitGlitches('click', x, y, 0.8);
  }

  // Ask the active theme for the glitches a trigger should produce, then append
  // them (dropping the oldest if we're over the concurrency ceiling). All
  // theme-specific look/behaviour lives behind spawnGlitches → glitches/<theme>.
  private emitGlitches(trigger: GlitchTrigger, x: number, y: number, amount: number): void {
    if (!this.state.showGlitches) return;
    const created = spawnGlitches({
      trigger,
      x,
      y,
      W: this.W,
      H: this.H,
      intensity: this.state.intensity,
      activity: this.state.activityLevel,
      motion: this.state.screen.motion,
      amount,
      glitchTheme: this.state.glitchTheme,
      colorTheme: this.state.colorTheme,
      params: this.state.glitchConfig?.[this.state.glitchTheme] ?? {},
      canvas: this.canvas,
    });
    for (const g of created) this.glitches.push(g);
    if (this.glitches.length > MAX_GLITCHES) {
      this.glitches.splice(0, this.glitches.length - MAX_GLITCHES);
    }
  }

  // Live system load (0..1), the max of CPU and RAM pressure. Drives the edge
  // glow hue/pulse and the stress-glitch rate; 0 when the channel is disabled.
  private systemLoad(): number {
    if (!this.state.systemLoadGlow) return 0;
    return Math.min(1, Math.max(this.state.system.cpu, this.state.system.ram) / 100);
  }

  // Target presence opacity: fade down when the user is away (and dimming is on).
  private presenceTarget(): number {
    const away = this.state.presenceDimming && this.state.presence && !this.state.presence.active;
    return away ? PRESENCE_DIM : 1;
  }

  // Flash the screen edge nearest a newly-appeared attention region, so a popup
  // is caught in the periphery on the side it actually showed up.
  private flashEdgeFor(cx: number, cy: number): void {
    const top = cy, bottom = this.H - cy, left = cx, right = this.W - cx;
    const min = Math.min(top, bottom, left, right);
    if (min === top) this.edgeFlash.top = 1;
    else if (min === bottom) this.edgeFlash.bottom = 1;
    else if (min === left) this.edgeFlash.left = 1;
    else this.edgeFlash.right = 1;
  }

  // Keep an id-tracking set from growing without bound over a long session:
  // region ids are monotonic and never reused, so once a region is gone we'll
  // never need its id again.
  private static prune(set: Set<number>, live: Set<number>): void {
    for (const id of set) if (!live.has(id)) set.delete(id);
  }

  // Append a screen-assist event to the retained Signal Log (deduped upstream by
  // id-tracking sets), trimming to a bounded, recent window.
  private logSignal(id: number, type: SignalEvent['type'], label: string, now: number): void {
    const active = this.state.presence?.active ?? true;
    this.signalEvents.push({ id, type, label, time: now, away: !active });
    if (this.signalEvents.length > MAX_SIGNAL_EVENTS) {
      this.signalEvents.splice(0, this.signalEvents.length - MAX_SIGNAL_EVENTS);
    }
  }

  // Detect the away↔present transition and, on return, open a brief "while you
  // were away" recap window — but only if something actually happened while gone.
  private trackPresenceRecap(now: number): void {
    const active = this.state.presence?.active ?? true;
    if (this.wasActive && !active) {
      this.awayStart = now; // just went away
    } else if (!this.wasActive && active) {
      const happened = this.signalEvents.some((e) => e.time >= this.awayStart);
      if (happened) this.recapUntil = now + RECAP_MS;
    }
    this.wasActive = active;
  }

  // React to attention regions once each: edge flash + radar for a fresh popup,
  // a celebratory pulse when a churning region completes, and a retained Signal
  // Log entry for each. Ids gate the one-shots.
  private processAttentionEvents(): void {
    const now = Date.now();
    this.trackPresenceRecap(now);

    // Expire stale log entries regardless of whether analysis is currently on.
    this.signalEvents = this.signalEvents.filter((e) => now - e.time < SIGNAL_TTL);

    const att = this.state.attention;
    if (!att?.enabled || !att.regions) { this.donePulses.length = 0; this.radarPings.length = 0; return; }

    const live = new Set<number>();

    for (const r of att.regions) {
      if (r.dismissed) continue;
      live.add(r.id);
      const cx = (r.x + r.w / 2) * this.W;
      const cy = (r.y + r.h / 2) * this.H;

      // Task complete: a region that was working has gone quiet.
      if (r.type === 'complete' && !this.completedSeenIds.has(r.id)) {
        this.completedSeenIds.add(r.id);
        this.logSignal(r.id, 'complete', 'COMPLETE', now);
        if (this.state.showTaskComplete) {
          this.donePulses.push({ cx: r.x + r.w / 2, cy: r.y + r.h / 2, born: now, label: 'COMPLETE' });
        }
      }

      // A fresh popup/alert: always catch it in the periphery with an edge flash
      // and log it; additionally fire a directional radar ping *only* when it
      // appeared away from where you're working (the one you'd actually miss).
      const isPopup = r.type === 'notification' || r.type === 'alert';
      if (isPopup && !this.flashedIds.has(r.id)) {
        this.flashedIds.add(r.id);
        this.flashEdgeFor(cx, cy);
        this.logSignal(r.id, r.type === 'alert' ? 'alert' : 'notification', r.label, now);
      }
      if (isPopup && this.state.showNotificationRadar && !this.radarSeenIds.has(r.id)) {
        const ox = this.focusInit ? this.focusX : this.state.mouse.x;
        const oy = this.focusInit ? this.focusY : this.state.mouse.y;
        const far = Math.hypot(cx - ox, cy - oy) > Math.min(this.W, this.H) * 0.33;
        if (far) {
          this.radarSeenIds.add(r.id);
          this.radarPings.push({ tx: r.x + r.w / 2, ty: r.y + r.h / 2, born: now, label: r.label });
        }
      }
    }

    CyberEngine.prune(this.flashedIds, live);
    CyberEngine.prune(this.radarSeenIds, live);
    CyberEngine.prune(this.completedSeenIds, live);
    this.donePulses = this.donePulses.filter((p) => now - p.born < DONE_PULSE_MS);
    this.radarPings = this.radarPings.filter((p) => now - p.born < RADAR_PING_MS);
  }

  // Ease the focus locus toward the cursor and the focus strength toward "are we
  // in sustained typing-focused work". Drives the focus spotlight.
  private updateFocus(dt: number): void {
    const { mouse } = this.state;
    if (!this.focusInit) { this.focusX = mouse.x; this.focusY = mouse.y; this.focusInit = true; }
    this.focusX += (mouse.x - this.focusX) * Math.min(1, dt / 500);
    this.focusY += (mouse.y - this.focusY) * Math.min(1, dt / 500);

    const now = Date.now();
    const away = !!this.state.presence && !this.state.presence.active;
    let target = 0;
    if (this.state.focusSpotlight && !away) {
      if (this.state.focusTrigger === 'active') {
        // Spotlight the work locus whenever you're present — HazeOver-style
        // "keep the background calm while I work", not only while typing.
        target = 1;
      } else {
        // Typing-only: engage during sustained typing, ease out when you stop.
        const recentKeys = this.state.keystrokes ? this.state.keystrokes.filter((k) => now - k.time < 4000).length : 0;
        target = Math.min(1, recentKeys / 8);
      }
    }
    this.focusStrength += (target - this.focusStrength) * Math.min(1, dt / 1200);
  }

  // Whether anything dynamic is currently on screen. The render loop uses this
  // to run at a lower frame rate when the overlay is idle (only the ambient
  // scanline scroll / edge-glow pulse are animating), and full rate when there's
  // real motion to keep smooth. Cheap — just reads a few counters/flags.
  isActive(): boolean {
    const s = this.state;
    if (!s.effectsEnabled) return false;
    if (!s.bootComplete) return true;
    if (s.activityLevel > 0.02) return true;
    if (this.glitches.length > 0) return true;
    if (this.trail.length > 0) return true;
    if (s.notificationFlash > 0) return true;
    if (s.showAudioViz && this.audioActive) return true;
    if (s.attention?.regions?.length > 0) return true;
    if (this.donePulses.length > 0) return true; // task-done pulse animating
    if (this.radarPings.length > 0) return true; // notification radar animating
    if (this.focusStrength > 0.02) return true; // focus spotlight engaged / easing out
    if (Date.now() < this.recapUntil) return true; // "while you were away" recap breathing
    if (s.presence && s.presence.breakLevel > 0) return true; // keep the break nudge breathing
    if (Math.abs(this.presenceAlpha - this.presenceTarget()) > 0.01) return true; // mid dim/undim
    if (this.systemLoad() > 0.7) return true; // keep the stress pulse smooth
    return false;
  }

  render(time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);

    if (!this.state.effectsEnabled) return;

    // Real elapsed time since the last painted frame drives glitch decay, so
    // lifetimes stay in wall-clock milliseconds regardless of the (capped,
    // idle-throttled) frame rate. Clamp to avoid a huge jump after a long gap.
    const dt = this.lastFrameTime ? Math.min(time - this.lastFrameTime, 100) : 16;
    this.lastFrameTime = time;

    // Boot animation takes over if not complete
    if (!this.state.bootComplete) {
      this.state.lastActivity = time;
      drawBootAnimation(ctx, this.W, this.H, this.state, time);
      return;
    }

    const { intensity, activityLevel, mouse, screen } = this.state;
    const load = this.systemLoad();

    // Ease the presence dim toward its target (present ↔ away).
    this.presenceAlpha += (this.presenceTarget() - this.presenceAlpha) * Math.min(1, dt / 300);

    // Decay directional edge flashes each frame.
    const flashDecay = Math.exp(-dt / 250);
    this.edgeFlash.top *= flashDecay;
    this.edgeFlash.right *= flashDecay;
    this.edgeFlash.bottom *= flashDecay;
    this.edgeFlash.left *= flashDecay;

    // Fold this frame's attention regions into one-shot assist events (edge
    // flash, notification radar, task-done pulse) and advance the focus locus.
    this.processAttentionEvents();
    this.updateFocus(dt);

    // Screen-reactive: motion under the overlay tears the signal.
    if (this.state.showGlitches && screen.motion > 0.05) {
      const motionGlitchChance = screen.motion * intensity * 0.15;
      if (Math.random() < motionGlitchChance && time - this.lastGlitch > 80) {
        this.emitGlitches('motion', mouse.x, mouse.y, screen.motion);
        this.lastGlitch = time;
      }
    }

    // Scanlines. Pass the boosted intensity as a scalar rather than cloning the
    // entire state object every frame (which was 60 allocations/sec/monitor of
    // avoidable GC pressure).
    const scanlineBoost = 1 + (1 - screen.brightness) * 0.6;
    drawScanlines(ctx, this.W, this.H, this.state, time, intensity * scanlineBoost);

    // Ambient background glitches — the theme's signature idle texture. A
    // stressed machine (high load) visibly destabilises: more, stronger glitches.
    if (this.state.showGlitches) {
      const glitchChance = this.state.glitchFrequency * intensity * (1 + activityLevel * 2 + screen.motion * 3 + load * 3);
      if (Math.random() < glitchChance && time - this.lastGlitch > 100) {
        this.emitGlitches('ambient', mouse.x, mouse.y, Math.min(1, 0.3 + Math.random() * 0.4 + load * 0.4));
        this.lastGlitch = time;
      }
    }

    // Advance + draw every live glitch, pruning the finished ones. We keep
    // advancing (so they decay away and can't leak) even when glitches are
    // toggled off mid-flight; we just stop painting them.
    this.glitches = this.glitches.filter((g) => {
      if (this.state.showGlitches) g.draw(ctx);
      return g.update(dt);
    });

    // Cursor trail
    drawCursorTrail(ctx, this.state);

    // Target highlight
    drawTargetHighlight(ctx, this.state, time);

    // Audio visualizer (refresh live FFT analysis first)
    if (this.state.showAudioViz) {
      this.audioCapture.update();
      drawAudioVisualizer(ctx, this.W, this.H, this.state);
    }

    // Screen-reactive color flash
    if (this.state.showColorFlash && screen.brightness > 0.6) {
      const flash = (screen.brightness - 0.6) * 2.5 * intensity;
      ctx.globalAlpha = flash * 0.03;
      const [r, g, b] = screen.dominantColor;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }

    // Notification flash
    if (this.state.showNotificationFlash) drawNotificationFlash(ctx, this.W, this.H, this.state);

    // Focus spotlight — gently dim the periphery around the work locus during
    // sustained typing-focus. Drawn (source-over) before the cinema cut-out so
    // the cut-out can erase this dim from over any playback region too.
    if (this.state.focusSpotlight) {
      drawFocusSpotlight(ctx, this.W, this.H, this.focusX, this.focusY, this.focusStrength, this.state);
    }

    // Cinema mode — erase the noisy/texture layers painted above from over any
    // detected video playback, so the overlay never obstructs what you watch.
    if (this.state.cinemaMode) suppressVideoRegions(ctx, this.W, this.H, this.state);

    // Attention highlights — real bounding boxes around the top salient regions.
    drawAttentionHighlights(ctx, this.W, this.H, this.state, time);

    // Notification radar — directional ping toward a popup you'd otherwise miss.
    if (this.state.showNotificationRadar) {
      const ox = this.focusInit ? this.focusX : this.state.mouse.x;
      const oy = this.focusInit ? this.focusY : this.state.mouse.y;
      drawNotificationRadar(ctx, this.W, this.H, this.radarPings, ox, oy, time, this.state);
    }

    // Task-done pulse — celebrate a long-running region going quiet.
    if (this.state.showTaskComplete) drawTaskComplete(ctx, this.W, this.H, this.donePulses, time, this.state);

    // Edge glow — hue/pulse encode system load; flashes toward notifications.
    if (this.state.showEdgeGlow) drawEdgeGlow(ctx, this.W, this.H, this.state, time, load, this.edgeFlash);

    // Focus ring — perimeter progress (pomodoro time left, else the hour).
    drawFocusRing(ctx, this.W, this.H, this.state);

    // Vignette
    if (this.state.showVignette) drawVignette(ctx, this.W, this.H, this.state);

    // Activity bar
    if (this.state.showActivityBar) drawActivityBar(ctx, this.state);

    // Clock
    if (this.state.showClock) {
      drawClock(ctx, this.W, this.H, this.state);
    }

    // Stats HUD
    if (this.state.showStatsHud) {
      drawStatsHud(ctx, this.W, this.H, this.state);
    }

    // Pomodoro
    if (this.state.showPomodoro) {
      drawPomodoro(ctx, this.W, this.H, this.state);
    }

    // Corner HUD readouts (positionable widgets)
    drawStatusHud(ctx, this.W, this.H, this.state);
    drawSysTag(ctx, this.W, this.H, this.state);

    // Signal Log — retained, glanceable record of recent screen-assist events,
    // reframed as a "while you were away" recap for a beat after you return.
    drawSignalLog(ctx, this.W, this.H, this.state, this.signalEvents, Date.now(), Date.now() < this.recapUntil, time);

    // Session time — ambient unbroken-screen-time readout (time-blindness aid).
    drawSessionTime(ctx, this.W, this.H, this.state, time);

    // Break nudge — calm 20-20-20 reminder, breathing above the HUD.
    drawBreakNudge(ctx, this.W, this.H, this.state, time);

    // Presence dimming — uniformly fade the whole overlay when the user is away.
    // `destination-out` scales every already-painted pixel's alpha down by
    // (1 - presenceAlpha), so the effect reads as one coherent fade.
    if (this.presenceAlpha < 0.999) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1 - this.presenceAlpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.restore();
    }
  }
}
