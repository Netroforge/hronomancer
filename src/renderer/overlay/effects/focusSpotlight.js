// A soft, movable darkening of the screen *periphery* while you're in sustained
// deep work — a spotlight that follows where you're working so the edges of the
// screen (other windows, panels, chrome) recede and the thing under your hands
// stays clear. Unlike the presence dim (which fades the overlay's own pixels),
// this paints a gentle dark wash over the real desktop, so it must be drawn with
// normal source-over compositing.
export function drawFocusSpotlight(ctx, W, H, locusX, locusY, strength, // 0..1, eased by the engine
state) {
    if (strength <= 0.01)
        return;
    // Peak darkness of the periphery, from the user's dim-strength knob: subtle at
    // 0 (~0.15), assertive at 1 (~0.7). It should calm the edges, not black them
    // out — HazeOver-style — so even the max stays this side of opaque.
    const peak = 0.15 + 0.55 * Math.min(1, Math.max(0, state.focusDimStrength ?? 0.5));
    const dim = peak * strength * Math.min(1, state.intensity + 0.3);
    // Clear centre out to ~28% of the diagonal, ramping to full dim by ~62%.
    const diag = Math.hypot(W, H);
    const inner = diag * 0.28;
    const outer = diag * 0.62;
    const grad = ctx.createRadialGradient(locusX, locusY, inner, locusX, locusY, outer);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${dim})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
}
