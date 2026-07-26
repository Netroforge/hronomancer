import { createDefaultState } from '../shared/types';
import type { CyberAPI, PerformanceProfile } from '../shared/types';
import { installTauriBridge } from '../shared/tauriBridge';
import { CyberEngine } from './effects/engine';

declare global {
  interface Window {
    cyberAPI: CyberAPI;
  }
}

const canvas = document.getElementById('cyberCanvas') as HTMLCanvasElement;

installTauriBridge();

let displayBounds = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };

function resizeCanvas(): void {
  canvas.width = displayBounds.width;
  canvas.height = displayBounds.height;
  canvas.style.width = `${displayBounds.width}px`;
  canvas.style.height = `${displayBounds.height}px`;
  console.log(`[Hronomancer] Canvas sized to ${canvas.width}x${canvas.height}`);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

window.cyberAPI?.onDisplayInfo((info) => {
  displayBounds = info.bounds;
  resizeCanvas();
  console.log(`[Hronomancer] Display ${info.displayId} bounds: ${info.bounds.width}x${info.bounds.height}`);
});

const state = createDefaultState();
const engine = new CyberEngine(canvas, state);

let performanceProfile: PerformanceProfile = 'balanced';

window.cyberAPI?.onStateUpdate((s) => {
  performanceProfile = s.performanceProfile ?? 'balanced';
  engine.updateState(s);
});

window.cyberAPI?.onMouseInput((d) => {
  // Translate global screen coords to local window coords
  const localX = d.x - displayBounds.x;
  const localY = d.y - displayBounds.y;
  engine.onMouseInput(localX, localY, d.vx, d.vy);
});

window.cyberAPI?.onKeyInput(() => {
  engine.onKeyInput();
});

window.cyberAPI?.onClickInput((d) => {
  const localX = d.x - displayBounds.x;
  const localY = d.y - displayBounds.y;
  engine.onClickInput(localX, localY);
});

window.cyberAPI?.getState();

// Frame-rate caps. The effects don't need 60 fps: 30 is smooth for the
// animated layers, and when nothing dynamic is happening we drop to a low
// idle rate so an untouched overlay costs almost nothing. rAF still ticks at
// the display rate — we just skip the expensive canvas work between targets.
const FRAME_RATES: Record<PerformanceProfile, { active: number; idle: number }> = {
  eco: { active: 20, idle: 5 },
  balanced: { active: 30, idle: 10 },
  smooth: { active: 60, idle: 15 },
};
let lastRenderTime = -Infinity;

function loop(time: number): void {
  const rates = FRAME_RATES[performanceProfile];
  const minInterval = 1000 / (engine.isActive() ? rates.active : rates.idle);
  if (time - lastRenderTime >= minInterval) {
    lastRenderTime = time;
    // Isolate a bad frame so a single thrown error can't permanently freeze
    // the overlay — the next frame is always scheduled.
    try {
      engine.render(time);
    } catch (err) {
      console.error('[Hronomancer] render error:', err);
    }
  }
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
