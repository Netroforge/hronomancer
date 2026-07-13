import type { OverlayState } from '../../shared/types';
import { themeColor, hexToRgb } from '../../shared/colors';
import { panelAnchor, drawPanel } from './layout';

export function drawPomodoro(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: OverlayState,
): void {
  const { pomodoro, colorTheme, intensity } = state;
  if (!pomodoro.active) return;

  const isWork = pomodoro.phase === 'work';
  const [r, g, b] = hexToRgb(isWork ? themeColor(colorTheme, 'primary') : themeColor(colorTheme, 'accent'));

  ctx.save();
  ctx.globalAlpha = intensity;

  // Solid styled panel; drawPanel returns the padded content origin.
  const PW = 200, PH = 82;
  const { x: panelX, y: panelY } = panelAnchor(state.layout.pomodoro, W, H, PW, PH);
  const { x, y } = drawPanel(ctx, panelX, panelY, PW, PH, [r, g, b], 14);

  // Phase label
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillText(isWork ? '/// WORK ///' : '/// BREAK ///', x, y);

  // Timer — large, with a soft neon glow in the phase colour.
  const mins = Math.floor(pomodoro.remainingSeconds / 60);
  const secs = pomodoro.remainingSeconds % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const glitchX = pomodoro.remainingSeconds <= 10 ? (Math.random() - 0.5) * 3 : 0;
  ctx.save();
  ctx.shadowColor = `rgba(${r},${g},${b},0.7)`;
  ctx.shadowBlur = 10;
  ctx.font = '700 32px "JetBrains Mono", monospace';
  ctx.fillText(timeStr, x + 6 + glitchX, y + 16);
  ctx.restore();

  // Progress bar
  const progress = pomodoro.remainingSeconds / pomodoro.totalSeconds;
  const barW = 172;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(x, y + 58, barW, 4);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(x, y + 58, barW * progress, 4);

  ctx.restore();
}
