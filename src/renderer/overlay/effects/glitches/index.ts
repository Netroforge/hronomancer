// Theme-specific glitch registry. Each theme's personality lives in its own
// file (see the sibling modules); this module just maps a theme id to its
// implementation and exposes a single `spawnGlitches` entry point the engine
// calls on every glitch trigger.
import type { Glitch, GlitchTheme, SpawnContext } from './types';
import { cyberGlitch } from './cyber';
import { matrixGlitch } from './matrix';
import { synthwaveGlitch } from './synthwave';
import { tronGlitch } from './tron';
import { cyberpunk2077Glitch } from './cyberpunk2077';
import { ghostGlitch } from './ghost';
import { terminatorGlitch } from './terminator';
import { evangelionGlitch } from './evangelion';

const REGISTRY: Record<string, GlitchTheme> = {
  [cyberGlitch.id]: cyberGlitch,
  [matrixGlitch.id]: matrixGlitch,
  [synthwaveGlitch.id]: synthwaveGlitch,
  [tronGlitch.id]: tronGlitch,
  [cyberpunk2077Glitch.id]: cyberpunk2077Glitch,
  [ghostGlitch.id]: ghostGlitch,
  [terminatorGlitch.id]: terminatorGlitch,
  [evangelionGlitch.id]: evangelionGlitch,
};

/** Spawn the glitches a trigger should emit, using the selected glitch style. */
export function spawnGlitches(c: SpawnContext): Glitch[] {
  const theme = REGISTRY[c.glitchTheme] ?? cyberGlitch;
  return theme.spawn(c);
}

export type { Glitch, GlitchTheme, SpawnContext, GlitchTrigger } from './types';
