import type { Glitch, SpawnContext } from './types';
export declare const on: (c: SpawnContext, key: string) => boolean;
export declare const amt: (c: SpawnContext, key: string) => number;
export declare const rand: (a: number, b: number) => number;
export declare const randInt: (a: number, b: number) => number;
export declare const pick: <T>(arr: readonly T[]) => T;
export declare const pickChar: (s: string) => string;
export declare const chance: (p: number) => boolean;
export declare const clamp01: (n: number) => number;
export declare function rgba(hex: string, alpha: number): string;
/** Classic displaced colour bar drifting horizontally, with an optional echo line. */
export declare function makeBar(o: {
    x: number;
    y: number;
    w: number;
    h: number;
    vx: number;
    color: string;
    life: number;
    alpha?: number;
}): Glitch;
/** Chromatic aberration: the same block drawn as two offset colour fringes. */
export declare function makeRgbSplit(o: {
    x: number;
    y: number;
    w: number;
    h: number;
    shift: number;
    colorA: string;
    colorB: string;
    life: number;
}): Glitch;
/** Falling column of glyphs with a bright leading character (code rain). */
export declare function makeGlyphStream(o: {
    x: number;
    y: number;
    glyphs: string;
    color: string;
    head: string;
    size: number;
    length: number;
    speed: number;
    life: number;
    bottom?: number;
}): Glitch;
/** A burst of random speckles in a region — digital static / noise. */
export declare function makeStatic(o: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    density: number;
    life: number;
}): Glitch;
/** A horizontal band of sine-offset scanlines — analog/VHS wave distortion. */
export declare function makeWave(o: {
    y: number;
    W: number;
    h: number;
    color: string;
    life: number;
    amp?: number;
}): Glitch;
/** A glowing geometric outline, optionally expanding — Tron "derez" ring. */
export declare function makeWireBox(o: {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    life: number;
    expand?: number;
    glow?: number;
}): Glitch;
/** Corner-bracket targeting reticle that locks onto a point and fades. */
export declare function makeReticle(o: {
    x: number;
    y: number;
    size: number;
    color: string;
    life: number;
}): Glitch;
/** A pulsing hexagon outline — NERV / AT-field motif. */
export declare function makeHex(o: {
    x: number;
    y: number;
    r: number;
    color: string;
    life: number;
    rot?: number;
}): Glitch;
/** A short flickering text label — hex codes, warnings, HUD tags. */
export declare function makeLabel(o: {
    x: number;
    y: number;
    text: string;
    color: string;
    size: number;
    life: number;
    weight?: number;
}): Glitch;
/**
 * A momentary horizontal screen tear: copies a band of whatever's already been
 * painted this frame and re-stamps it shifted sideways. Short-lived by design.
 */
export declare function makeSliceTear(o: {
    canvas: HTMLCanvasElement;
    W: number;
    H: number;
    life: number;
    maxShift?: number;
}): Glitch;
