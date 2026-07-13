import { makeReticle, makeLabel, makeBar, makeGlyphStream, on, amt, pick, rand, randInt, chance } from './common';
// TERMINATOR — the T-800's red infrared HUD. Corner-bracket targeting reticles,
// scrolling 6502/Apple-II machine code (the film's real on-screen easter egg)
// and blunt analysis call-outs. Monochrome red by design, regardless of palette.
// Sub-effects: reticle / codeDump / hudBars / callouts.
const RED = '#ff0000';
const HOT = '#ff4444';
const DIM = '#aa0000';
const CODE = [
    'LDA #$FF', 'STA $2000', 'JSR $FCA8', 'LDX #$00', 'CMP $C010', 'BNE $F1CE',
    'A9 FF 8D 00', '0E A2 00 20', 'ROL $D021,X', 'INC $0400', 'RTS', 'SEI',
];
const CALLOUTS = ['SCANNING...', 'TARGET LOCKED', 'MOTION DETECTED', 'THREAT ASSESSMENT', 'ANALYSIS: 0x1A', 'MATCH FOUND', 'PRIORITY OVERRIDE'];
export const terminatorGlitch = {
    id: 'terminator',
    signature: 'Red IR HUD — targeting reticles, scrolling 6502 code and analysis tags.',
    spawn(c) {
        const out = [];
        if (c.trigger === 'key') {
            if (on(c, 'codeDump'))
                out.push(makeLabel({ x: c.x + rand(-10, 10), y: c.y - 12, text: pick(CODE), color: HOT, size: 12, life: rand(600, 1000), weight: 400 }));
            return out;
        }
        if (c.trigger === 'click') {
            if (on(c, 'reticle'))
                out.push(makeReticle({ x: c.x, y: c.y, size: rand(20, 40), color: RED, life: rand(700, 1200) }));
            if (on(c, 'callouts'))
                out.push(makeLabel({ x: c.x + 24, y: c.y - 20, text: pick(CALLOUTS), color: HOT, size: 11, life: rand(600, 1000) }));
            return out;
        }
        // motion / ambient — code hexdump drifting, HUD bars, occasional lock-on.
        if (on(c, 'codeDump') && chance(0.6 * amt(c, 'codeDump'))) {
            out.push(makeGlyphStream({
                x: rand(0, c.W * 0.3), y: rand(-30, c.H * 0.4), glyphs: '0123456789ABCDEF ', color: DIM, head: RED,
                size: randInt(11, 14), length: randInt(5, 11), speed: rand(1.5, 3), life: rand(1000, 2000), bottom: c.H,
            }));
        }
        if (on(c, 'hudBars')) {
            const bars = Math.round((1 + c.amount * 2) * amt(c, 'hudBars'));
            for (let i = 0; i < bars; i++) {
                out.push(makeBar({ x: 0, y: rand(0, c.H), w: c.W, h: rand(1, 3), vx: 0, color: DIM, life: rand(200, 500), alpha: 0.3 }));
            }
        }
        if (on(c, 'reticle') && chance((0.15 + c.motion * 0.3) * amt(c, 'reticle'))) {
            out.push(makeReticle({ x: rand(c.W * 0.2, c.W * 0.8), y: rand(c.H * 0.2, c.H * 0.8), size: rand(18, 34), color: RED, life: rand(500, 900) }));
        }
        if (on(c, 'callouts') && chance(0.2 * amt(c, 'callouts'))) {
            out.push(makeLabel({ x: rand(20, c.W - 160), y: rand(20, c.H - 40), text: pick(CALLOUTS), color: HOT, size: 11, life: rand(500, 900) }));
        }
        return out;
    },
};
