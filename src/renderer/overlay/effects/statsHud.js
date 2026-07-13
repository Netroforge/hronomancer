import { themeColor, hexToRgb } from '../../shared/colors';
import { panelAnchor, drawPanel } from './layout';
export function drawStatsHud(ctx, W, H, state) {
    const { system, colorTheme, intensity } = state;
    const [r, g, b] = hexToRgb(themeColor(colorTheme, 'accent'));
    ctx.save();
    ctx.globalAlpha = intensity;
    // Solid styled panel; drawPanel returns the padded content origin.
    const PW = 238, PH = 110;
    const { x: panelX, y: panelY } = panelAnchor(state.layout.statsHud, W, H, PW, PH);
    const { x, y: y0 } = drawPanel(ctx, panelX, panelY, PW, PH, [r, g, b], 14);
    let y = y0;
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    // CPU
    ctx.fillStyle = getCpuColor(system.cpu, r, g, b);
    ctx.fillText(`CPU`, x, y);
    drawBar(ctx, x + 44, y + 3, 122, 10, system.cpu / 100, r, g, b);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillText(`${system.cpu}%`, x + 174, y);
    y += 26;
    // RAM
    ctx.fillStyle = getRamColor(system.ram, r, g, b);
    ctx.fillText(`RAM`, x, y);
    drawBar(ctx, x + 44, y + 3, 122, 10, system.ram / 100, r, g, b);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillText(`${system.ram}%`, x + 174, y);
    y += 30;
    // Uptime
    ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
    ctx.font = '400 11px "JetBrains Mono", monospace';
    const hrs = Math.floor(system.uptime / 3600);
    const mins = Math.floor((system.uptime % 3600) / 60);
    ctx.fillText(`UP: ${hrs}h ${mins}m`, x, y);
    y += 17;
    // RAM total
    ctx.fillText(`MEM: ${system.ramTotal}GB`, x, y);
    ctx.restore();
}
function drawBar(ctx, x, y, w, h, pct, r, g, b) {
    // Track.
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, w, h);
    // Fill.
    const fillW = w * Math.min(pct, 1);
    ctx.fillStyle = `rgba(${r},${g},${b},0.75)`;
    ctx.fillRect(x, y, fillW, h);
    // Bright leading edge so the level pops.
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x + Math.max(0, fillW - 2), y, Math.min(2, fillW), h);
}
function getCpuColor(pct, r, g, b) {
    if (pct > 80)
        return '#ff2a6d';
    if (pct > 50)
        return '#faff00';
    return `rgb(${r},${g},${b})`;
}
function getRamColor(pct, r, g, b) {
    if (pct > 85)
        return '#ff2a6d';
    if (pct > 60)
        return '#faff00';
    return `rgb(${r},${g},${b})`;
}
