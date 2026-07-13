import type { Glitch, GlitchTheme, SpawnContext } from './types';
import { makeWireBox, makeBar, makeLabel, on, amt, pick, rand, chance } from './common';

// TRON — clean, geometric, glowing. No noise: crisp wireframe rectangles that
// "derez" outward, precise grid lines and the occasional I/O tag.
// Sub-effects: wireframes / derez / gridLines / tags.
const CYAN = '#00d4ff';
const BLUE = '#0066ff';
const WHITE = '#ffffff';
const ORANGE = '#ff9900'; // the "villain" accent
const TAGS = ['I/O', 'CLU', 'TRON', 'GRID', '1001', 'RINZLER'];

export const tronGlitch: GlitchTheme = {
  id: 'tron',
  signature: 'Glowing geometric wireframes, derez rings and precise grid lines.',
  spawn(c: SpawnContext): Glitch[] {
    const out: Glitch[] = [];

    if (c.trigger === 'key') {
      if (on(c, 'tags')) out.push(makeLabel({ x: c.x + rand(-10, 10), y: c.y - 12, text: pick(TAGS), color: CYAN, size: 11, life: rand(500, 900) }));
      return out;
    }

    if (c.trigger === 'click') {
      if (on(c, 'derez')) {
        const n = Math.round(3 * amt(c, 'derez'));
        for (let i = 0; i < n; i++) {
          const s = 10 + i * 14;
          out.push(makeWireBox({
            x: c.x - s, y: c.y - s, w: s * 2, h: s * 2, color: chance(0.2) ? ORANGE : CYAN,
            life: rand(500, 900), expand: rand(20, 60), glow: 8,
          }));
        }
      }
      return out;
    }

    // motion / ambient — floating wireframes and thin grid lines.
    if (on(c, 'wireframes')) {
      const n = Math.round((1 + c.amount * 2) * amt(c, 'wireframes'));
      for (let i = 0; i < n; i++) {
        const w = rand(40, 160);
        const h = rand(20, 120);
        out.push(makeWireBox({
          x: rand(0, c.W - w), y: rand(0, c.H - h), w, h, color: pick([CYAN, BLUE, WHITE]),
          life: rand(600, 1400), expand: chance(0.3) ? rand(10, 30) : 0, glow: 6,
        }));
      }
    }
    if (on(c, 'gridLines') && chance(0.5 * amt(c, 'gridLines'))) {
      const horizontal = chance(0.5);
      out.push(makeBar({
        x: horizontal ? 0 : rand(0, c.W), y: horizontal ? rand(0, c.H) : 0,
        w: horizontal ? c.W : 1, h: horizontal ? 1 : c.H, vx: 0, color: CYAN, life: rand(300, 700), alpha: 0.4,
      }));
    }
    return out;
  },
};
