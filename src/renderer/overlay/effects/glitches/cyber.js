import { makeBar, makeRgbSplit, makeGlyphStream, makeStatic, makeSliceTear, on, amt, pick, rand, randInt, chance } from './common';
// CYBER DEFAULT — the classic neon-glitch look: multicoloured displaced bars,
// chromatic-aberration splits, hex-dump code and the occasional screen tear.
// Sub-effects (bars / rgbSplit / hexCode / sliceTear) are individually tunable.
const PALETTE = ['#05d9e8', '#ff2a6d', '#00ff41', '#d100d1', '#faff00'];
const HEX = '0123456789ABCDEF';
const HEAD = '#e8ffff';
export const cyberGlitch = {
    id: 'cyber',
    signature: 'Neon displaced bars, RGB split, hex code and screen tears.',
    spawn(c) {
        const out = [];
        if (c.trigger === 'key') {
            if (on(c, 'hexCode')) {
                out.push(makeGlyphStream({
                    x: c.x + rand(-20, 20), y: c.y - 10, glyphs: HEX, color: pick(PALETTE), head: HEAD,
                    size: 13, length: randInt(3, 6), speed: rand(2, 4), life: rand(500, 900),
                }));
            }
            return out;
        }
        if (c.trigger === 'click') {
            if (on(c, 'bars')) {
                const n = Math.round(5 * amt(c, 'bars'));
                for (let i = 0; i < n; i++) {
                    out.push(makeBar({
                        x: c.x + rand(-40, 40), y: c.y + rand(-40, 40), w: rand(30, 110), h: rand(2, 8),
                        vx: rand(-2, 2), color: pick(PALETTE), life: rand(300, 700),
                    }));
                }
                out.push(makeStatic({ x: c.x - 40, y: c.y - 20, w: 80, h: 40, color: pick(PALETTE), density: 24, life: 260 }));
            }
            return out;
        }
        // motion / ambient — background texture scaled by the strength hint.
        if (on(c, 'bars')) {
            const n = Math.round((1 + c.amount * 4) * amt(c, 'bars'));
            for (let i = 0; i < n; i++) {
                out.push(makeBar({
                    x: rand(0, c.W), y: rand(0, c.H), w: rand(10, 130), h: rand(2, 12),
                    vx: rand(-2, 2), color: pick(PALETTE), life: rand(400, 1400),
                }));
            }
        }
        if (on(c, 'rgbSplit') && chance(0.3 * amt(c, 'rgbSplit'))) {
            const w = rand(60, 200);
            out.push(makeRgbSplit({
                x: rand(0, c.W - w), y: rand(0, c.H), w, h: rand(6, 24), shift: rand(3, 9),
                colorA: '#ff2a6d', colorB: '#05d9e8', life: rand(300, 700),
            }));
        }
        if (c.trigger === 'motion' && on(c, 'sliceTear') && chance((0.4 + c.motion * 0.4) * amt(c, 'sliceTear'))) {
            out.push(makeSliceTear({ canvas: c.canvas, W: c.W, H: c.H, life: 120, maxShift: 20 + c.motion * 50 }));
        }
        return out;
    },
};
