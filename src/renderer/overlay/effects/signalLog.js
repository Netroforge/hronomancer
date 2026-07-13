import { themeColor, hexToRgb } from '../../shared/colors';
import { legibleText, clearShadow, drawPanel, panelAnchor } from './layout';
// The Signal Log turns Screen Assist's transient cues into something you can
// actually come back to. Task-Done pulses and notification pings fire for a
// couple of seconds and vanish — precisely when you may have looked away, which
// is the whole point of detecting them. This panel keeps the last few events
// with a relative timestamp so a glance answers "did my build finish / did I
// miss a popup while I was heads-down?". When you return from being away it
// briefly reframes as a "while you were away" recap of what happened.
const MAX_SHOWN = 5;
const ROW_H = 15;
const HEADER_H = 16;
function iconFor(type) {
    switch (type) {
        case 'complete': return '✓'; // ✓
        case 'alert': return '✕'; // ✕-ish urgent marker
        default: return '◈'; // ◈ notification
    }
}
function colorFor(type, theme) {
    switch (type) {
        case 'complete': return hexToRgb(themeColor(theme, 'accent'));
        case 'alert': return [255, 80, 80];
        default: return hexToRgb(themeColor(theme, 'secondary'));
    }
}
// Compact "how long ago" — seconds under a minute, then minutes, then hours.
function ago(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60)
        return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m`;
    return `${Math.floor(m / 60)}h`;
}
export function drawSignalLog(ctx, W, H, state, events, now, recap, // just returned from away → reframe as a recap
time) {
    if (!state.showSignalLog || events.length === 0)
        return;
    const shown = events.slice(-MAX_SHOWN).reverse(); // newest first
    const rows = shown.length;
    const PW = 182;
    const PH = 12 + HEADER_H + rows * ROW_H + 4;
    const [pr, pg, pb] = hexToRgb(themeColor(state.colorTheme, 'primary'));
    ctx.save();
    ctx.globalAlpha = state.intensity;
    const { x: panelX, y: panelY } = panelAnchor(state.layout.signalLog, W, H, PW, PH);
    // On a recap, breathe the panel accent so the "while you were away" state reads
    // as a momentary, gentle highlight rather than a static box.
    const pulse = recap ? 0.6 + 0.4 * Math.sin(time / 260) : 1;
    const accent = recap
        ? hexToRgb(themeColor(state.colorTheme, 'accent'))
        : [pr, pg, pb];
    const { x, y } = drawPanel(ctx, panelX, panelY, PW, PH, accent.map((c) => Math.round(c * pulse)));
    // Header.
    legibleText(ctx);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    if (recap) {
        const awayCount = shown.filter((e) => e.away).length || shown.length;
        ctx.fillStyle = `rgb(${accent.map((c) => Math.round(c * pulse)).join(',')})`;
        ctx.fillText(`◂ WHILE AWAY · ${awayCount}`, x, y);
    }
    else {
        ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
        ctx.fillText('SIGNAL LOG', x, y);
    }
    clearShadow(ctx);
    // Rows: icon + label + relative time, most recent at the top.
    let ry = y + HEADER_H;
    for (const e of shown) {
        const [r, g, b] = colorFor(e.type, state.colorTheme);
        // Fade older rows slightly so the freshest signal reads first.
        const ageFade = Math.max(0.5, 1 - (now - e.time) / (10 * 60_000));
        legibleText(ctx);
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(${r},${g},${b},${ageFade})`;
        ctx.fillText(iconFor(e.type), x, ry);
        ctx.font = '400 10px "JetBrains Mono", monospace';
        ctx.fillText(e.label, x + 15, ry + 1);
        // Right-aligned relative time.
        clearShadow(ctx);
        ctx.textAlign = 'right';
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${0.6 * ageFade})`;
        ctx.fillText(ago(now - e.time), panelX + PW - 12, ry + 1);
        ctx.textAlign = 'left';
        ry += ROW_H;
    }
    ctx.restore();
}
