import { themeColor, hexToRgb } from '../../shared/colors';
export function drawAudioVisualizer(ctx, W, H, state) {
    const { audio, colorTheme, intensity } = state;
    if (audio.volume < 0.01)
        return;
    const barCount = 32;
    const barWidth = W / barCount;
    const maxBarHeight = H * 0.15;
    const [r, g, b] = hexToRgb(themeColor(colorTheme, 'primary'));
    ctx.save();
    ctx.globalAlpha = intensity * 0.6;
    // Bottom frequency bars
    for (let i = 0; i < barCount; i++) {
        const freq = audio.waveform[i] || 0;
        const barH = freq * maxBarHeight;
        const x = i * barWidth;
        const y = H - barH;
        const gradient = ctx.createLinearGradient(x, H, x, y);
        gradient.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0.1)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 1, y, barWidth - 2, barH);
    }
    // Top mirrored bars (fainter)
    ctx.globalAlpha = intensity * 0.2;
    for (let i = 0; i < barCount; i++) {
        const freq = audio.waveform[i] || 0;
        const barH = freq * maxBarHeight * 0.5;
        const x = i * barWidth;
        ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
        ctx.fillRect(x + 1, 0, barWidth - 2, barH);
    }
    // Bass pulse ring around cursor
    if (audio.bass > 0.3) {
        const pulseSize = 30 + audio.bass * 80;
        ctx.beginPath();
        ctx.arc(state.mouse.x, state.mouse.y, pulseSize, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${audio.bass * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    ctx.restore();
}
