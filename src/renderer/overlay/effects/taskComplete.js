import { themeColor, hexToRgb } from '../../shared/colors';
import { legibleText } from './layout';
export const DONE_PULSE_MS = 2600;
export function drawTaskComplete(ctx, W, H, pulses, time, state) {
    if (pulses.length === 0)
        return;
    const now = Date.now();
    const [r, g, b] = hexToRgb(themeColor(state.colorTheme, 'accent'));
    const intensity = state.intensity;
    ctx.save();
    for (const p of pulses) {
        const t = (now - p.born) / DONE_PULSE_MS; // 0..1 progress
        if (t >= 1)
            continue;
        const x = p.cx * W;
        const y = p.cy * H;
        // Ease-out so the burst is fast then settles.
        const ease = 1 - Math.pow(1 - t, 3);
        const fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85; // quick in, slow out
        // Two staggered expanding rings.
        for (let i = 0; i < 2; i++) {
            const rt = Math.max(0, ease - i * 0.18);
            if (rt <= 0)
                continue;
            const radius = 14 + rt * 90;
            ctx.globalAlpha = Math.max(0, fade) * intensity * (0.7 - i * 0.3);
            ctx.strokeStyle = `rgb(${r},${g},${b})`;
            ctx.lineWidth = 2.5 - i;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        // Check mark inside a snap-in circle at the centre.
        const pop = Math.min(1, t / 0.25); // scales up over the first quarter
        const cr = 13 * pop;
        ctx.globalAlpha = Math.max(0, fade) * intensity;
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, cr, 0, Math.PI * 2);
        ctx.stroke();
        if (pop >= 1) {
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x - 1.5, y + 5);
            ctx.lineTo(x + 7, y - 6);
            ctx.stroke();
        }
        // Label, rising slightly as it fades.
        ctx.globalAlpha = Math.max(0, fade) * intensity;
        legibleText(ctx);
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(p.label, x, y - 20 - ease * 10);
    }
    ctx.restore();
}
