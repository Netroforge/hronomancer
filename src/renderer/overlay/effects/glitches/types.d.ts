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
    x: number;
    y: number;
    intensity: number;
    activity: number;
    motion: number;
    amount: number;
    glitchTheme: string;
    colorTheme: ThemePreset;
    params: Record<string, GlitchParamValue>;
    canvas: HTMLCanvasElement;
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
