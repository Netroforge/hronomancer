import { themeColor, hexToRgb } from '../../shared/colors';
import { legibleText, clearShadow } from './layout';
// How many regions to actually frame at once. Attention is scarce: showing
// every detection is noise, so we surface only the top-scoring couple. The
// remaining tracked regions still drive the dedicated assist effects (task-done
// pulse, notification radar, cinema mode) — they just don't get a bracket.
const MAX_SHOWN = 2;
// `video` gets no bracket (cinema mode's job is to leave playback alone) and
// `complete` is drawn by the task-done pulse instead — so neither competes for a
// highlight slot here.
function isHighlightable(type) {
    return type !== 'video' && type !== 'complete';
}
// Per-type accent, so the *colour* pre-attentively encodes what was detected.
function colorFor(type, theme) {
    switch (type) {
        case 'notification': return hexToRgb(themeColor(theme, 'secondary')); // the theme's "alert" hue
        case 'alert': return [255, 64, 64];
        case 'text': return hexToRgb(themeColor(theme, 'primary'));
        default: return hexToRgb(themeColor(theme, 'accent')); // motion
    }
}
export function drawAttentionHighlights(ctx, W, H, state, time) {
    const { attention, colorTheme, intensity } = state;
    if (!attention.enabled || !attention.regions || attention.regions.length === 0)
        return;
    const shown = attention.regions
        .filter((r) => !r.dismissed && isHighlightable(r.type))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_SHOWN);
    if (shown.length === 0)
        return;
    ctx.save();
    for (const region of shown) {
        drawRegionHighlight(ctx, region, colorFor(region.type, colorTheme), intensity, time, W, H);
    }
    ctx.restore();
}
function drawRegionHighlight(ctx, region, [cr, cg, cb], intensity, time, W, H) {
    // Normalised box → this overlay's pixels. Inset slightly so the frame sits
    // just outside the detected content rather than clipping it.
    const sx = region.x * W;
    const sy = region.y * H;
    const sw = Math.max(24, region.w * W);
    const sh = Math.max(20, region.h * H);
    const age = (Date.now() - region.born) / 1000;
    const pulse = Math.sin(time / 300) * 0.3 + 0.7;
    const fadeIn = Math.min(1, age * 4);
    const alpha = Math.min(1, region.score * 1.4) * intensity * fadeIn;
    if (alpha <= 0.02)
        return;
    ctx.globalAlpha = alpha;
    // Marching-dash border tracing the actual bounding box.
    ctx.shadowColor = `rgba(${cr},${cg},${cb},${0.4 * pulse})`;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.75 * pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.lineDashOffset = -time / 50;
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);
    // Solid corner brackets (crisper "lock-on" than the dashed edge alone).
    const bl = 12 + pulse * 5;
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
    ctx.beginPath();
    ctx.moveTo(sx, sy + bl);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + bl, sy);
    ctx.moveTo(sx + sw - bl, sy);
    ctx.lineTo(sx + sw, sy);
    ctx.lineTo(sx + sw, sy + bl);
    ctx.moveTo(sx + sw, sy + sh - bl);
    ctx.lineTo(sx + sw, sy + sh);
    ctx.lineTo(sx + sw - bl, sy + sh);
    ctx.moveTo(sx + bl, sy + sh);
    ctx.lineTo(sx, sy + sh);
    ctx.lineTo(sx, sy + sh - bl);
    ctx.stroke();
    // Very subtle interior wash.
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.035 * pulse})`;
    ctx.fillRect(sx, sy, sw, sh);
    // Label + score bar, anchored to whichever edge keeps them on-screen.
    const labelAbove = sy > 16;
    const ly = labelAbove ? sy - 13 : sy + sh + 3;
    legibleText(ctx);
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
    ctx.fillText(region.label, sx + 2, ly);
    clearShadow(ctx);
    const barY = labelAbove ? sy - 3 : sy + sh + 14;
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.25)`;
    ctx.fillRect(sx + 2, barY, 32, 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.85)`;
    ctx.fillRect(sx + 2, barY, 32 * Math.min(1, region.score), 2);
}
