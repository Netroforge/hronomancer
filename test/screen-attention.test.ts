import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeScreenForAttention } from '../src/renderer/controller/screenAttention.ts';
import { createDefaultState } from '../src/renderer/shared/types.ts';

const WIDTH = 256;
const HEIGHT = 144;

function frame(value: number): Uint8Array {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = 255;
  }
  return pixels;
}

test('screen attention keeps temporal baselines isolated per display', () => {
  const first = createDefaultState().attention;
  const second = createDefaultState().attention;
  const dark = frame(0);
  const bright = frame(255);

  analyzeScreenForAttention(dark, WIDTH, HEIGHT, first);
  first.prevFrame = dark;
  analyzeScreenForAttention(bright, WIDTH, HEIGHT, first);

  const secondPulse = analyzeScreenForAttention(bright, WIDTH, HEIGHT, second);

  assert.equal(secondPulse.anyNew, false);
  assert.deepEqual(second.regions, []);
});
