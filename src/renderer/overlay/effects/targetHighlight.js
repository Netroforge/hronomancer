import { themeColor, hexToRgb } from '../../shared/colors';
export function drawTargetHighlight(ctx, state, time) {
    const { showTargetHighlight, intensity, colorTheme } = state;
    if (!showTargetHighlight)
        return;
    const cx = state.mouse.x;
    const cy = state.mouse.y;
    const speed = Math.sqrt(state.mouseVel.x ** 2 + state.mouseVel.y ** 2);
    const baseSize = 25 + Math.min(speed, 50) * 0.5;
    const pulse = Math.sin(time / 200) * 3;
    const [r, g, b] = hexToRgb(themeColor(colorTheme, 'primary'));
    const [sr, sg, sb] = hexToRgb(themeColor(colorTheme, 'secondary'));
    const [ar, ag, ab] = hexToRgb(themeColor(colorTheme, 'accent'));
    ctx.save();
    ctx.globalAlpha = intensity;
    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, baseSize + pulse, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, baseSize * 0.5 + pulse * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${sr},${sg},${sb},0.4)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Crosshair
    const ch = baseSize * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - ch, cy);
    ctx.lineTo(cx + ch, cy);
    ctx.moveTo(cx, cy - ch);
    ctx.lineTo(cx, cy + ch);
    ctx.strokeStyle = `rgba(${ar},${ag},${ab},0.6)`;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Corner brackets
    const bSize = baseSize * 0.4;
    const bLen = 6;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`;
    ctx.lineWidth = 1.5;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(cx - bSize, cy - bSize + bLen);
    ctx.lineTo(cx - bSize, cy - bSize);
    ctx.lineTo(cx - bSize + bLen, cy - bSize);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(cx + bSize - bLen, cy - bSize);
    ctx.lineTo(cx + bSize, cy - bSize);
    ctx.lineTo(cx + bSize, cy - bSize + bLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(cx - bSize, cy + bSize - bLen);
    ctx.lineTo(cx - bSize, cy + bSize);
    ctx.lineTo(cx - bSize + bLen, cy + bSize);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(cx + bSize - bLen, cy + bSize);
    ctx.lineTo(cx + bSize, cy + bSize);
    ctx.lineTo(cx + bSize, cy + bSize - bLen);
    ctx.stroke();
    ctx.restore();
}
