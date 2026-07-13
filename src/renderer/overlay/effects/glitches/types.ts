import type { ThemePreset, GlitchParamValue } from '../../../shared/types';

/**
 * A single live glitch particle. Behaviour (motion + decay) and appearance are
 * bundled into the object itself via closures, so the engine can hold a flat
 * `Glitch[]` and drive every kind — from any theme — through the same two calls.
 */
export interface Glitch {
  /** Advance by `dt` milliseconds. Return `false` once the glitch is finished. */
  update(dt: number): boolean;
  draw(ctx: CanvasRenderingContext2D): void;
}

/**
 * What caused a glitch to spawn. Each maps to a *meaning*, and every theme
 * renders that meaning in its own visual language:
 *   - `key`     you typed — code/glyphs spill out where the cursor is
 *   - `click`   an impact at a point — a localized burst / lock-on
 *   - `motion`  the screen underneath moved — signal tearing / distortion
 *   - `ambient` idle background texture — the theme's signature effect
 */
export type GlitchTrigger = 'key' | 'click' | 'motion' | 'ambient';

/** Everything a theme needs to decide what to spawn and where. */
export interface SpawnContext {
  trigger: GlitchTrigger;
  W: number;
  H: number;
  x: number; // event/cursor position (screen-local)
  y: number;
  intensity: number; // 0..1 master intensity
  activity: number; // 0..1 recent user activity
  motion: number; // 0..1 screen motion under the overlay
  amount: number; // 0..1 strength hint for this particular spawn
  glitchTheme: string; // id of the glitch style to spawn — independent of the colour theme
  colorTheme: ThemePreset; // active colour palette (available if a glitch wants to tint)
  params: Record<string, GlitchParamValue>; // per-sub-effect knobs for this glitch theme
  canvas: HTMLCanvasElement; // source for self-referential effects (slice tear)
}

/**
 * A theme's glitch personality. One implementation lives in each
 * `glitches/<theme>.ts` file and is registered in `glitches/index.ts`.
 */
export interface GlitchTheme {
  id: string;
  /** One-line description of this theme's glitch identity (docs/tooling). */
  signature: string;
  /** Produce the glitches a given trigger should emit for this theme. */
  spawn(c: SpawnContext): Glitch[];
}
