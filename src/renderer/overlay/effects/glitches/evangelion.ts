import type { Glitch, GlitchTheme, SpawnContext } from './types';
import { makeHex, makeLabel, makeBar, on, amt, pick, rand, randInt, chance } from './common';

// EVANGELION — the NERV / MAGI alert aesthetic: pure phosphor colours on black,
// angular hazard bars, pulsing hexagon (AT-field) frames and stark Japanese
// warning text. 警告 = "warning", パターン青 = "Pattern Blue", 使徒 = "Angel".
// Sub-effects: hexWarnings / hazardBars / warningLabels.
const RED = '#ff2a2a';
const ORANGE = '#ff6600';
const GREEN = '#00ff66'; // MAGI phosphor
const BLUE = '#3aa0ff'; // "Pattern Blue"
const WARNINGS = ['警告', 'パターン青', '使徒', 'ATフィールド', '緊急', 'NERV', 'MAGI', 'けいこく', 'SYNC 400%'];

export const evangelionGlitch: GlitchTheme = {
  id: 'evangelion',
  signature: 'NERV alert — pulsing AT-field hexagons, hazard bars and 警告 warnings.',
  spawn(c: SpawnContext): Glitch[] {
    const out: Glitch[] = [];

    if (c.trigger === 'key') {
      if (on(c, 'warningLabels')) out.push(makeLabel({ x: c.x + rand(-10, 10), y: c.y - 14, text: pick(WARNINGS), color: pick([RED, ORANGE, GREEN]), size: 14, life: rand(600, 1100) }));
      return out;
    }

    if (c.trigger === 'click') {
      if (on(c, 'hexWarnings')) out.push(makeHex({ x: c.x, y: c.y, r: rand(24, 48), color: pick([RED, ORANGE]), life: rand(700, 1200), rot: rand(0, Math.PI) }));
      if (on(c, 'warningLabels')) out.push(makeLabel({ x: c.x + 20, y: c.y - 24, text: pick(['警告', 'パターン青', '使徒']), color: RED, size: 13, life: rand(600, 1000) }));
      return out;
    }

    // motion / ambient — hazard bars, hexagons and blinking warnings.
    if (on(c, 'hazardBars')) {
      const bars = Math.round((1 + c.amount * 2) * amt(c, 'hazardBars'));
      for (let i = 0; i < bars; i++) {
        out.push(makeBar({ x: 0, y: rand(0, c.H), w: c.W, h: rand(2, 6), vx: 0, color: pick([RED, ORANGE]), life: rand(300, 700), alpha: 0.35 }));
      }
    }
    if (on(c, 'hexWarnings') && chance(0.4 * amt(c, 'hexWarnings'))) {
      out.push(makeHex({ x: rand(c.W * 0.2, c.W * 0.8), y: rand(c.H * 0.2, c.H * 0.8), r: rand(20, 50), color: pick([RED, ORANGE, BLUE]), life: rand(600, 1200), rot: rand(0, Math.PI) }));
    }
    if (on(c, 'warningLabels') && chance(0.35 * amt(c, 'warningLabels'))) {
      out.push(makeLabel({ x: rand(20, c.W - 120), y: rand(20, c.H - 40), text: pick(WARNINGS), color: pick([RED, GREEN, ORANGE]), size: randInt(12, 16), life: rand(500, 1000) }));
    }
    return out;
  },
};
