import type { Glitch, GlitchTheme, SpawnContext } from './types';
import { makeGlyphStream, on, amt, rand, randInt } from './common';

// MATRIX — the digital rain. The film's glyphs are mirrored half-width katakana
// (Unicode block U+FF66–U+FF9D) mixed with Arabic numerals and a few Latin
// letters/symbols; the leading character of each column glows near-white while
// the trail fades to phosphor green. Sub-effects: rain (ambient) / cascade (input).
const KATAKANA = 'ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜｾﾎﾀﾇﾏｹﾒｴｶｷﾑﾕﾗｸｦｧｨｩｪｫｬｭｮｯﾎﾍﾌ';
const GLYPHS = KATAKANA + '0123456789Z:."=*+|<>¦çﾘ';
const GREEN = '#00ff41';
const HEAD = '#c8ffd0';

function stream(x: number, y: number, bottom: number, len: [number, number], life: [number, number]): Glitch {
  return makeGlyphStream({
    x, y, glyphs: GLYPHS, color: GREEN, head: HEAD,
    size: randInt(12, 18), length: randInt(len[0], len[1]), speed: rand(2, 5),
    life: rand(life[0], life[1]), bottom,
  });
}

export const matrixGlitch: GlitchTheme = {
  id: 'matrix',
  signature: 'Falling half-width katakana rain with a glowing leading glyph.',
  spawn(c: SpawnContext): Glitch[] {
    const out: Glitch[] = [];

    if (c.trigger === 'key') {
      if (on(c, 'cascade')) out.push(stream(c.x + rand(-30, 30), c.y, c.H, [4, 8], [700, 1200]));
      return out;
    }

    if (c.trigger === 'click') {
      if (on(c, 'cascade')) {
        const n = Math.round(3 * amt(c, 'cascade'));
        for (let i = 0; i < n; i++) out.push(stream(c.x + rand(-40, 40), c.y + rand(-20, 20), c.H, [4, 10], [600, 1100]));
      }
      return out;
    }

    // ambient / motion — full-height columns raining across the screen.
    if (on(c, 'rain')) {
      const n = Math.round((1 + c.amount * 3) * amt(c, 'rain'));
      for (let i = 0; i < n; i++) {
        out.push(stream(rand(0, c.W), rand(-c.H * 0.3, c.H * 0.3), c.H, [6, 16], [1400, 2800]));
      }
    }
    return out;
  },
};
