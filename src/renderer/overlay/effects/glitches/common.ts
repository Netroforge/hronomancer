import type { Glitch, SpawnContext } from './types';
import { hexToRgb } from '../../../shared/colors';

// ─── Per-sub-effect config accessors ────────────────────────────
// Themes gate each sub-effect on `on(c, key)` and scale its count/rate by
// `amt(c, key)`, both driven by the user's granular glitch config. Unknown keys
// default to on at 1× so a theme never silently goes dark.

export const on = (c: SpawnContext, key: string): boolean => c.params[key]?.enabled ?? true;
export const amt = (c: SpawnContext, key: string): number => c.params[key]?.intensity ?? 1;

// ─── Tiny RNG / util helpers ────────────────────────────────────
export const rand = (a: number, b: number): number => a + Math.random() * (b - a);
export const randInt = (a: number, b: number): number => Math.floor(rand(a, b + 1));
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const pickChar = (s: string): string => s.charAt(Math.floor(Math.random() * s.length));
export const chance = (p: number): boolean => Math.random() < p;
export const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const MONO = '"JetBrains Mono", "Courier New", monospace';

// A glitch that only reads `t/max` for its fade is common enough to share a
// small helper: `elapsed()` returns 0→1 remaining life so draw code stays terse.
function lifeTimer(max: number): { tick: (dt: number) => boolean; remaining: () => number } {
  let t = 0;
  return {
    tick: (dt) => {
      t += dt;
      return t < max;
    },
    remaining: () => clamp01(1 - t / max),
  };
}

// ─── Reusable glitch factories ──────────────────────────────────
// Each returns a `Glitch`; themes compose these with their own palette/params.

/** Classic displaced colour bar drifting horizontally, with an optional echo line. */
export function makeBar(o: {
  x: number; y: number; w: number; h: number; vx: number; color: string; life: number; alpha?: number;
}): Glitch {
  const life = lifeTimer(o.life);
  let x = o.x;
  const peak = o.alpha ?? 0.7;
  return {
    update(dt) {
      x += o.vx * (dt / 16);
      return life.tick(dt);
    },
    draw(ctx) {
      const k = life.remaining();
      ctx.save();
      ctx.globalAlpha = k * peak;
      ctx.fillStyle = o.color;
      ctx.fillRect(x, o.y, o.w, o.h);
      if (k > 0.5) ctx.fillRect(x, o.y + o.h + 2, o.w * 0.6, 1);
      ctx.restore();
    },
  };
}

/** Chromatic aberration: the same block drawn as two offset colour fringes. */
export function makeRgbSplit(o: {
  x: number; y: number; w: number; h: number; shift: number; colorA: string; colorB: string; life: number;
}): Glitch {
  const life = lifeTimer(o.life);
  return {
    update: life.tick,
    draw(ctx) {
      const k = life.remaining();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = k * 0.5;
      ctx.fillStyle = o.colorA;
      ctx.fillRect(o.x - o.shift, o.y, o.w, o.h);
      ctx.fillStyle = o.colorB;
      ctx.fillRect(o.x + o.shift, o.y, o.w, o.h);
      ctx.restore();
    },
  };
}

/** Falling column of glyphs with a bright leading character (code rain). */
export function makeGlyphStream(o: {
  x: number; y: number; glyphs: string; color: string; head: string;
  size: number; length: number; speed: number; life: number; bottom?: number;
}): Glitch {
  const life = lifeTimer(o.life);
  let y = o.y;
  const chars: string[] = [];
  for (let i = 0; i < o.length; i++) chars.push(pickChar(o.glyphs));
  let mutate = 0;
  return {
    update(dt) {
      y += o.speed * (dt / 16);
      mutate += dt;
      if (mutate > 70) {
        chars[randInt(0, chars.length - 1)] = pickChar(o.glyphs);
        mutate = 0;
      }
      const alive = life.tick(dt);
      // Also retire once the whole column has scrolled off the bottom.
      const offscreen = o.bottom !== undefined && y - o.length * o.size > o.bottom;
      return alive && !offscreen;
    },
    draw(ctx) {
      const k = life.remaining();
      ctx.save();
      ctx.font = `${o.size}px ${MONO}`;
      ctx.textBaseline = 'top';
      for (let i = 0; i < chars.length; i++) {
        const cy = y - i * o.size;
        const fade = 1 - i / chars.length;
        ctx.globalAlpha = k * fade * (i === 0 ? 1 : 0.55);
        ctx.fillStyle = i === 0 ? o.head : o.color;
        ctx.fillText(chars[i], o.x, cy);
      }
      ctx.restore();
    },
  };
}

/** A burst of random speckles in a region — digital static / noise. */
export function makeStatic(o: {
  x: number; y: number; w: number; h: number; color: string; density: number; life: number;
}): Glitch {
  const life = lifeTimer(o.life);
  return {
    update: life.tick,
    draw(ctx) {
      const k = life.remaining();
      ctx.save();
      ctx.globalAlpha = k * 0.8;
      ctx.fillStyle = o.color;
      for (let i = 0; i < o.density; i++) {
        ctx.fillRect(o.x + Math.random() * o.w, o.y + Math.random() * o.h, rand(1, 3), rand(1, 2));
      }
      ctx.restore();
    },
  };
}

/** A horizontal band of sine-offset scanlines — analog/VHS wave distortion. */
export function makeWave(o: {
  y: number; W: number; h: number; color: string; life: number; amp?: number;
}): Glitch {
  const life = lifeTimer(o.life);
  let phase = rand(0, Math.PI * 2);
  const amp = o.amp ?? 12;
  return {
    update(dt) {
      phase += dt / 60;
      return life.tick(dt);
    },
    draw(ctx) {
      const k = life.remaining();
      ctx.save();
      ctx.fillStyle = o.color;
      for (let i = 0; i < o.h; i++) {
        const off = Math.sin(phase + i * 0.4) * (amp * k + 4);
        ctx.globalAlpha = k * 0.22;
        ctx.fillRect(off, o.y + i, o.W, 1);
      }
      ctx.restore();
    },
  };
}

/** A glowing geometric outline, optionally expanding — Tron "derez" ring. */
export function makeWireBox(o: {
  x: number; y: number; w: number; h: number; color: string; life: number; expand?: number; glow?: number;
}): Glitch {
  const life = lifeTimer(o.life);
  return {
    update: life.tick,
    draw(ctx) {
      const k = life.remaining();
      const grow = o.expand ? (1 - k) * o.expand : 0;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 1.5;
      if (o.glow) {
        ctx.shadowColor = o.color;
        ctx.shadowBlur = o.glow;
      }
      ctx.strokeRect(o.x - grow, o.y - grow, o.w + grow * 2, o.h + grow * 2);
      ctx.restore();
    },
  };
}

/** Corner-bracket targeting reticle that locks onto a point and fades. */
export function makeReticle(o: {
  x: number; y: number; size: number; color: string; life: number;
}): Glitch {
  const life = lifeTimer(o.life);
  return {
    update: life.tick,
    draw(ctx) {
      const k = life.remaining();
      const s = o.size * (1 + k * 0.4); // eases inward as it settles
      const c = s / 3;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 1.5;
      const bracket = (cx: number, cy: number, dx: number, dy: number): void => {
        ctx.beginPath();
        ctx.moveTo(cx + dx, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + dy);
        ctx.stroke();
      };
      bracket(o.x - s, o.y - s, c, c);
      bracket(o.x + s, o.y - s, -c, c);
      bracket(o.x - s, o.y + s, c, -c);
      bracket(o.x + s, o.y + s, -c, -c);
      ctx.restore();
    },
  };
}

/** A pulsing hexagon outline — NERV / AT-field motif. */
export function makeHex(o: {
  x: number; y: number; r: number; color: string; life: number; rot?: number;
}): Glitch {
  const life = lifeTimer(o.life);
  let t = 0;
  const rot = o.rot ?? 0;
  return {
    update(dt) {
      t += dt;
      return life.tick(dt);
    },
    draw(ctx) {
      const k = life.remaining();
      ctx.save();
      ctx.globalAlpha = k * (0.4 + 0.6 * Math.abs(Math.sin(t / 130))); // hazard blink
      ctx.strokeStyle = o.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = rot + (i * Math.PI) / 3;
        const px = o.x + Math.cos(a) * o.r;
        const py = o.y + Math.sin(a) * o.r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    },
  };
}

/** A short flickering text label — hex codes, warnings, HUD tags. */
export function makeLabel(o: {
  x: number; y: number; text: string; color: string; size: number; life: number; weight?: number;
}): Glitch {
  const life = lifeTimer(o.life);
  return {
    update: life.tick,
    draw(ctx) {
      if (Math.random() < 0.12) return; // flicker: occasionally drop a frame
      const k = life.remaining();
      ctx.save();
      ctx.globalAlpha = k;
      ctx.font = `${o.weight ?? 700} ${o.size}px ${MONO}`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = o.color;
      ctx.fillText(o.text, o.x, o.y);
      ctx.restore();
    },
  };
}

/**
 * A momentary horizontal screen tear: copies a band of whatever's already been
 * painted this frame and re-stamps it shifted sideways. Short-lived by design.
 */
export function makeSliceTear(o: {
  canvas: HTMLCanvasElement; W: number; H: number; life: number; maxShift?: number;
}): Glitch {
  const life = lifeTimer(o.life);
  const y = Math.random() * o.H;
  const h = rand(2, 30);
  const shift = rand(-1, 1) * (o.maxShift ?? 40);
  return {
    update: life.tick,
    draw(ctx) {
      try {
        ctx.drawImage(o.canvas, 0, y, o.W, h, shift, y, o.W, h);
      } catch {
        /* drawImage can throw on a zero-size band; ignore */
      }
    },
  };
}
