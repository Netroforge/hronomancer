import type { OverlayState } from '../../shared/types';
import { themeColor, hexToRgb } from '../../shared/colors';
import { panelAnchor, drawPanel } from './layout';

export function drawClock(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: OverlayState,
): void {
  const { colorTheme, intensity, activityLevel } = state;
  const [r, g, b] = hexToRgb(themeColor(colorTheme, 'primary'));

  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase();

  ctx.save();
  ctx.globalAlpha = intensity;

  // Solid styled panel; drawPanel returns the padded content origin.
  const PW = 208, PH = 92;
  const { x: panelX, y: panelY } = panelAnchor(state.layout.clock, W, H, PW, PH);
  const { x: clockX, y: clockY } = drawPanel(ctx, panelX, panelY, PW, PH, [r, g, b], 14);

  // Glitch offset on seconds change
  const glitchX = (Math.random() > 0.95 ? (Math.random() - 0.5) * 4 : 0) * activityLevel;
  const glitchY = (Math.random() > 0.95 ? (Math.random() - 0.5) * 2 : 0) * activityLevel;

  ctx.textBaseline = 'top';

  // Time — large, with a soft neon glow in the theme colour so it reads as a lit
  // readout against the dark panel.
  ctx.save();
  ctx.shadowColor = `rgba(${r},${g},${b},0.7)`;
  ctx.shadowBlur = 10;
  ctx.font = '700 38px "JetBrains Mono", monospace';
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillText(`${hours}:${minutes}`, clockX + glitchX, clockY + glitchY);
  ctx.restore();

  // Seconds (smaller, secondary color)
  const [sr, sg, sb] = hexToRgb(themeColor(colorTheme, 'secondary'));
  ctx.font = '400 20px "JetBrains Mono", monospace';
  ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
  ctx.fillText(`:${seconds}`, clockX + 122 + glitchX, clockY + 16 + glitchY);

  // Separator line
  ctx.beginPath();
  ctx.moveTo(clockX, clockY + 48);
  ctx.lineTo(clockX + 180, clockY + 48);
  ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Date
  const [ar, ag, ab] = hexToRgb(themeColor(colorTheme, 'accent'));
  ctx.font = '400 13px "JetBrains Mono", monospace';
  ctx.fillStyle = `rgb(${ar},${ag},${ab})`;
  ctx.fillText(date, clockX + glitchX, clockY + 56 + glitchY);

  ctx.restore();
}
