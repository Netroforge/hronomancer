import { makeRgbSplit, makeGlyphStream, makeBar, makeLabel, makeSliceTear, on, amt, pick, rand, randInt, chance } from './common';
// CYBERPUNK 2077 — the Breach Protocol / netrunner look: yellow-on-black hex
// pair matrices, red-and-cyan chromatic tearing, and daemon/breach call-outs.
// Sub-effects: codeMatrix / rgbSplit / labels / trackingBar / sliceTear.
const YELLOW = '#fcee09';
const RED = '#ff003c';
const CYAN = '#00f0ff';
const WORDS = ['BREACH', 'DATAMINE', 'ICEPICK', 'DAEMON', '//ACCESS', 'V.EXE', 'UPLOAD', ' n/DEF'];
const HEX_PAIRS = ['1C', 'BD', 'E9', '55', '7A', 'FF', 'A3', '2D', '0C', '88', 'E1', '7F'];
const HEXCHARS = '0123456789ABCDEF';
export const cyberpunk2077Glitch = {
    id: 'cyberpunk2077',
    signature: 'Breach-protocol hex matrices, red/cyan chromatic tearing, daemon tags.',
    spawn(c) {
        const out = [];
        if (c.trigger === 'key') {
            if (on(c, 'labels')) {
                const text = chance(0.5) ? pick(HEX_PAIRS) : pick(WORDS);
                out.push(makeLabel({ x: c.x + rand(-10, 20), y: c.y - 12, text, color: YELLOW, size: 12, life: rand(600, 1100) }));
            }
            return out;
        }
        if (c.trigger === 'click') {
            if (on(c, 'rgbSplit')) {
                const w = rand(80, 180);
                out.push(makeRgbSplit({ x: c.x - w / 2, y: c.y + rand(-20, 20), w, h: rand(10, 28), shift: rand(5, 14), colorA: RED, colorB: CYAN, life: rand(300, 700) }));
            }
            if (on(c, 'labels')) {
                const n = Math.round(2 * amt(c, 'labels'));
                for (let i = 0; i < n; i++) {
                    out.push(makeLabel({ x: c.x + rand(-30, 30), y: c.y + rand(-30, 30), text: pick(WORDS), color: pick([YELLOW, RED]), size: 11, life: rand(400, 800) }));
                }
            }
            return out;
        }
        // motion / ambient — code matrix column plus fringe tearing.
        if (on(c, 'codeMatrix') && chance(0.6 * amt(c, 'codeMatrix'))) {
            out.push(makeGlyphStream({
                x: rand(0, c.W), y: rand(-40, c.H * 0.3), glyphs: HEXCHARS, color: YELLOW, head: '#ffffff',
                size: randInt(12, 16), length: randInt(5, 12), speed: rand(2, 4), life: rand(1000, 2000), bottom: c.H,
            }));
        }
        if (on(c, 'rgbSplit')) {
            const splits = Math.round((1 + c.amount * 2) * amt(c, 'rgbSplit'));
            for (let i = 0; i < splits; i++) {
                const w = rand(60, 200);
                out.push(makeRgbSplit({ x: rand(0, c.W - w), y: rand(0, c.H), w, h: rand(8, 26), shift: rand(4, 12), colorA: RED, colorB: CYAN, life: rand(300, 800) }));
            }
        }
        if (on(c, 'trackingBar') && chance(0.4 * amt(c, 'trackingBar'))) {
            out.push(makeBar({ x: 0, y: rand(0, c.H), w: c.W, h: rand(1, 3), vx: 0, color: YELLOW, life: rand(200, 500), alpha: 0.35 }));
        }
        if (c.trigger === 'motion' && on(c, 'sliceTear') && chance(0.4 * amt(c, 'sliceTear'))) {
            out.push(makeSliceTear({ canvas: c.canvas, W: c.W, H: c.H, life: 120, maxShift: 25 + c.motion * 45 }));
        }
        return out;
    },
};
