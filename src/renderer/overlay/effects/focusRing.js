import { themeColor, hexToRgb } from '../../shared/colors';
// Strokes `fraction` (0..1) of the screen perimeter, clockwise from the
// top-left corner. A glanceable, extreme-periphery progress indicator.
function strokePerimeter(ctx, W, H, inset, fraction) {
    const x0 = inset, y0 = inset, x1 = W - inset, y1 = H - inset;
    const hSpan = x1 - x0;
    const vSpan = y1 - y0;
    const total = 2 * hSpan + 2 * vSpan;
    let remaining = Math.max(0, Math.min(1, fraction)) * total;
    if (remaining <= 0 || total <= 0)
        return;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    let seg = Math.min(remaining, hSpan);
    ctx.lineTo(x0 + seg, y0);
    remaining -= seg;
    if (remaining > 0) {
        seg = Math.min(remaining, vSpan);
        ctx.lineTo(x1, y0 + seg);
        remaining -= seg;
    }
    if (remaining > 0) {
        seg = Math.min(remaining, hSpan);
        ctx.lineTo(x1 - seg, y1);
        remaining -= seg;
    }
    if (remaining > 0) {
        seg = Math.min(remaining, vSpan);
        ctx.lineTo(x0, y1 - seg);
    }
    ctx.stroke();
}
/**
 * A progress arc traced around the screen edge:
 *   - Pomodoro active → time remaining in the session (ring depletes), coloured
 *     by phase (work vs break).
 *   - Otherwise → a faint marker of progress through the current hour, so time
 *     passing registers in the periphery without a visible clock.
 */
export function drawFocusRing(ctx, W, H, state) {
    if (!state.showFocusRing)
        return;
    const { pomodoro, colorTheme, intensity } = state;
    let fraction;
    let color;
    let alpha;
    if (pomodoro.active && pomodoro.totalSeconds > 0) {
        fraction = pomodoro.remainingSeconds / pomodoro.totalSeconds; // depletes as time runs out
        color = pomodoro.phase === 'break' ? themeColor(colorTheme, 'accent') : themeColor(colorTheme, 'primary');
        alpha = 0.7;
    }
    else {
        const now = new Date();
        fraction = (now.getMinutes() * 60 + now.getSeconds()) / 3600; // progress through the hour
        color = themeColor(colorTheme, 'glow');
        alpha = 0.18; // ambient, easy to ignore
    }
    const [r, g, b] = hexToRgb(color);
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha * intensity + (pomodoro.active ? 0.15 : 0));
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    strokePerimeter(ctx, W, H, 3, fraction);
    ctx.restore();
}
