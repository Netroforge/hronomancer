import type { Glitch, GlitchTheme, SpawnContext } from './types';
import { makeRgbSplit, makeStatic, makeGlyphStream, on, amt, rand, randInt, chance } from './common';

// GHOST IN THE SHELL — restraint. Thermoptic-camouflage shimmer: barely-there
// chromatic ripples, sparse pale-green cipher and faint static. Everything is
// low-alpha and short-lived. Sub-effects: shimmer / cipher / staticNoise.
const WHITE = '#e8f4ff';
const GREEN = '#7dffb0';
const CIPHER = 'ｦｧｨｩｪ0123456789ABCDEF日本語電脳網';

export const ghostGlitch: GlitchTheme = {
  id: 'ghost',
  signature: 'Thermoptic shimmer — faint chromatic ripples and sparse pale cipher.',
  spawn(c: SpawnContext): Glitch[] {
    const out: Glitch[] = [];

    if (c.trigger === 'key') {
      if (on(c, 'cipher')) {
        out.push(makeGlyphStream({
          x: c.x + rand(-16, 16), y: c.y - 8, glyphs: CIPHER, color: GREEN, head: WHITE,
          size: 12, length: randInt(2, 5), speed: rand(1, 2.5), life: rand(500, 900),
        }));
      }
      return out;
    }

    if (c.trigger === 'click') {
      if (on(c, 'shimmer')) {
        const w = rand(50, 120);
        out.push(makeRgbSplit({ x: c.x - w / 2, y: c.y - 8, w, h: rand(6, 16), shift: rand(2, 5), colorA: WHITE, colorB: GREEN, life: rand(250, 500) }));
      }
      if (on(c, 'staticNoise')) out.push(makeStatic({ x: c.x - 30, y: c.y - 15, w: 60, h: 30, color: WHITE, density: 10, life: 220 }));
      return out;
    }

    // motion / ambient — sparse, faint. Motion reveals the camouflage seams.
    if (on(c, 'shimmer') && chance((0.35 + c.motion * 0.4) * amt(c, 'shimmer'))) {
      const w = rand(80, 200);
      out.push(makeRgbSplit({ x: rand(0, c.W - w), y: rand(0, c.H), w, h: rand(8, 24), shift: rand(2, 6), colorA: WHITE, colorB: GREEN, life: rand(300, 700) }));
    }
    if (on(c, 'cipher') && chance(0.25 * amt(c, 'cipher'))) {
      out.push(makeGlyphStream({
        x: rand(0, c.W), y: rand(-30, c.H * 0.2), glyphs: CIPHER, color: GREEN, head: WHITE,
        size: randInt(11, 14), length: randInt(3, 7), speed: rand(1.5, 3), life: rand(900, 1600), bottom: c.H,
      }));
    }
    if (on(c, 'staticNoise') && chance(0.2 * amt(c, 'staticNoise'))) {
      out.push(makeStatic({ x: rand(0, c.W - 120), y: rand(0, c.H), w: rand(60, 120), h: rand(10, 30), color: WHITE, density: 12, life: rand(150, 300) }));
    }
    return out;
  },
};
