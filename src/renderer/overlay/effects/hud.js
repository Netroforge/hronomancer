import { themeColor, hexToRgb } from '../../shared/colors';
import { panelAnchor, drawPanel } from './layout';
// The vignette gradient only depends on size + intensity, none of which change
// per frame — building a radial gradient every frame was pure waste. Cache it
// and rebuild only when one of those inputs actually changes. (One canvas/ctx
// per overlay window, so this module-level cache is safely per-window.)
let vignetteCache = null;
export function drawVignette(ctx, W, H, state) {
    const { intensity } = state;
    if (!vignetteCache ||
        vignetteCache.W !== W ||
        vignetteCache.H !== H ||
        vignetteCache.intensity !== intensity) {
        const gradient = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.8);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, `rgba(0,0,0,${0.5 * intensity})`);
        vignetteCache = { grad: gradient, W, H, intensity };
    }
    ctx.fillStyle = vignetteCache.grad;
    ctx.fillRect(0, 0, W, H);
}
const lerp = (a, b, t) => a + (b - a) * t;
// Blend the glow colour by system load: theme glow → amber → red. This is the
// pre-attentive channel — hue alone tells you how hard the machine is working.
function loadColor(base, load) {
    const amber = [255, 176, 32];
    const red = [255, 48, 32];
    if (load <= 0)
        return base;
    if (load < 0.6) {
        const t = load / 0.6;
        return [lerp(base[0], amber[0], t), lerp(base[1], amber[1], t), lerp(base[2], amber[2], t)];
    }
    const t = (load - 0.6) / 0.4;
    return [lerp(amber[0], red[0], t), lerp(amber[1], red[1], t), lerp(amber[2], red[2], t)];
}
export function drawEdgeGlow(ctx, W, H, state, time, load = 0, edgeFlash) {
    const { intensity, colorTheme } = state;
    const base = hexToRgb(themeColor(colorTheme, 'glow'));
    const [r, g, b] = loadColor(base, load).map(Math.round);
    // Higher load → faster pulse, brighter, slightly thicker border.
    const speed = 500 - load * 340;
    const pulse = 0.3 + Math.sin(time / speed) * 0.15 + load * 0.25;
    const lineW = 2 + load * 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, intensity * pulse);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = lineW;
    ctx.strokeRect(lineW / 2, lineW / 2, W - lineW, H - lineW);
    // Corner accents
    const cornerLen = 20;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, cornerLen);
    ctx.lineTo(0, 0);
    ctx.lineTo(cornerLen, 0);
    ctx.moveTo(W - cornerLen, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, cornerLen);
    ctx.moveTo(W, H - cornerLen);
    ctx.lineTo(W, H);
    ctx.lineTo(W - cornerLen, H);
    ctx.moveTo(cornerLen, H);
    ctx.lineTo(0, H);
    ctx.lineTo(0, H - cornerLen);
    ctx.stroke();
    ctx.restore();
    // Directional notification cue: a bright bar along the edge nearest a popup.
    if (edgeFlash) {
        const [fr, fg, fb] = hexToRgb(themeColor(colorTheme, 'secondary'));
        const thick = 6;
        ctx.save();
        ctx.fillStyle = `rgb(${fr},${fg},${fb})`;
        if (edgeFlash.top > 0.01) {
            ctx.globalAlpha = edgeFlash.top * 0.85;
            ctx.fillRect(0, 0, W, thick);
        }
        if (edgeFlash.bottom > 0.01) {
            ctx.globalAlpha = edgeFlash.bottom * 0.85;
            ctx.fillRect(0, H - thick, W, thick);
        }
        if (edgeFlash.left > 0.01) {
            ctx.globalAlpha = edgeFlash.left * 0.85;
            ctx.fillRect(0, 0, thick, H);
        }
        if (edgeFlash.right > 0.01) {
            ctx.globalAlpha = edgeFlash.right * 0.85;
            ctx.fillRect(W - thick, 0, thick, H);
        }
        ctx.restore();
    }
}
// The activity / intensity / cursor-position readout. Positionable like the
// other HUD panels via `state.layout.status`.
export function drawStatusHud(ctx, W, H, state) {
    if (!state.showStatus)
        return;
    const { intensity, activityLevel, colorTheme } = state;
    const [r, g, b] = hexToRgb(themeColor(colorTheme, 'primary'));
    ctx.save();
    ctx.globalAlpha = intensity;
    const PW = 150, PH = 76;
    const { x: panelX, y: panelY } = panelAnchor(state.layout.status, W, H, PW, PH);
    const { x, y } = drawPanel(ctx, panelX, panelY, PW, PH, [r, g, b], 13);
    ctx.font = '400 13px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillText(`ACT: ${(activityLevel * 100).toFixed(0)}%`, x, y);
    ctx.fillText(`INT: ${(intensity * 100).toFixed(0)}%`, x, y + 18);
    ctx.fillText(`POS: ${state.mouse.x.toFixed(0)},${state.mouse.y.toFixed(0)}`, x, y + 36);
    ctx.restore();
}
// The SYS://NODE identity tag. Positionable via `state.layout.sysTag`.
export function drawSysTag(ctx, W, H, state) {
    if (!state.showSysTag)
        return;
    const { intensity, colorTheme } = state;
    const [r, g, b] = hexToRgb(themeColor(colorTheme, 'primary'));
    const [ar, ag, ab] = hexToRgb(themeColor(colorTheme, 'accent'));
    ctx.save();
    ctx.globalAlpha = intensity;
    const PW = 232, PH = 56;
    const { x: panelX, y: panelY } = panelAnchor(state.layout.sysTag, W, H, PW, PH);
    const { x, y } = drawPanel(ctx, panelX, panelY, PW, PH, [ar, ag, ab], 13);
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = `rgb(${ar},${ag},${ab})`;
    ctx.fillText(`SYS://HRONOMANCER//V1.0`, x, y);
    ctx.font = '400 13px "JetBrains Mono", monospace';
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillText(`NODE://88//ACTIVE`, x, y + 18);
    ctx.restore();
}
export function drawActivityBar(ctx, state) {
    const { activityLevel, intensity } = state;
    const x = state.mouse.x + 20;
    const y = state.mouse.y - 5;
    const barW = 30;
    const barH = 3;
    ctx.save();
    ctx.globalAlpha = intensity * 0.6;
    // Background
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x, y, barW, barH);
    // Fill
    let color = '#00ff41';
    if (activityLevel > 0.6)
        color = '#faff00';
    if (activityLevel > 0.8)
        color = '#ff2a6d';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW * activityLevel, barH);
    ctx.restore();
}
