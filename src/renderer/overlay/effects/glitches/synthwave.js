import { makeWave, makeRgbSplit, makeBar, makeSliceTear, makeLabel, on, amt, pick, rand, randInt, chance } from './common';
// SYNTHWAVE / VHS — analog video artefacts: heavy chromatic aberration, wavy
// horizontal distortion, tracking-line dropouts and the odd VHS on-screen tag.
// Sub-effects: wave / rgbSplit / trackingBars / osd / sliceTear.
const PINK = '#ff6ec7';
const PURPLE = '#7b2ff7';
const CYAN = '#00e5ff';
const YELLOW = '#ffdd00';
const OSD = ['▶ PLAY', '⏸ PAUSE', 'REC ●', 'TRACKING', 'SP', 'AUTO', '── : ──'];
export const synthwaveGlitch = {
    id: 'synthwave',
    signature: 'VHS chromatic aberration, wavy distortion bands and tracking dropouts.',
    spawn(c) {
        const out = [];
        if (c.trigger === 'key') {
            if (on(c, 'osd'))
                out.push(makeLabel({ x: c.x + rand(-10, 10), y: c.y - 12, text: pick(OSD), color: PINK, size: 12, life: rand(500, 900) }));
            return out;
        }
        if (c.trigger === 'click') {
            if (on(c, 'rgbSplit')) {
                const n = Math.round(3 * amt(c, 'rgbSplit'));
                for (let i = 0; i < n; i++) {
                    const w = rand(60, 160);
                    out.push(makeRgbSplit({
                        x: c.x - w / 2, y: c.y + rand(-30, 30), w, h: rand(8, 26), shift: rand(4, 12),
                        colorA: PINK, colorB: CYAN, life: rand(300, 700),
                    }));
                }
            }
            return out;
        }
        // motion / ambient — wavy bands + tracking bars, more violent with motion.
        if (on(c, 'wave') && chance(0.7 * amt(c, 'wave'))) {
            out.push(makeWave({ y: rand(0, c.H - 40), W: c.W, h: randInt(10, 30), color: pick([PINK, PURPLE, CYAN]), life: rand(500, 1100), amp: 8 + c.amount * 18 }));
        }
        if (on(c, 'trackingBars')) {
            const bars = Math.round((1 + c.amount * 3) * amt(c, 'trackingBars'));
            for (let i = 0; i < bars; i++) {
                out.push(makeBar({ x: 0, y: rand(0, c.H), w: c.W, h: rand(1, 4), vx: 0, color: pick([PINK, YELLOW]), life: rand(200, 600), alpha: 0.3 }));
            }
        }
        if (on(c, 'rgbSplit') && chance(0.4 * amt(c, 'rgbSplit'))) {
            const w = rand(80, 240);
            out.push(makeRgbSplit({ x: rand(0, c.W - w), y: rand(0, c.H), w, h: rand(10, 30), shift: rand(4, 14), colorA: PINK, colorB: CYAN, life: rand(400, 900) }));
        }
        if (c.trigger === 'motion' && on(c, 'sliceTear') && chance(0.4 * amt(c, 'sliceTear'))) {
            out.push(makeSliceTear({ canvas: c.canvas, W: c.W, H: c.H, life: 140, maxShift: 30 + c.motion * 50 }));
        }
        return out;
    },
};
