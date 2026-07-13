import { createDefaultState } from '../shared/types';
import { CyberEngine } from './effects/engine';
const canvas = document.getElementById('cyberCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
console.log(`[Hronomancer] Canvas sized to ${canvas.width}x${canvas.height}`);
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
let displayBounds = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
window.cyberAPI?.onDisplayInfo((info) => {
    displayBounds = info.bounds;
    console.log(`[Hronomancer] Display ${info.displayId} bounds: ${info.bounds.width}x${info.bounds.height}`);
});
const state = createDefaultState();
const engine = new CyberEngine(canvas, state);
window.cyberAPI?.onStateUpdate((s) => {
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
const ACTIVE_FPS = 30;
const IDLE_FPS = 10;
let lastRenderTime = -Infinity;
function loop(time) {
    const minInterval = 1000 / (engine.isActive() ? ACTIVE_FPS : IDLE_FPS);
    if (time - lastRenderTime >= minInterval) {
        lastRenderTime = time;
        // Isolate a bad frame so a single thrown error can't permanently freeze
        // the overlay — the next frame is always scheduled.
        try {
            engine.render(time);
        }
        catch (err) {
            console.error('[Hronomancer] render error:', err);
        }
    }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
