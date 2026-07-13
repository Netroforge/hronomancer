import type { OverlayState } from '../../shared/types';
import { legibleText } from './layout';

// Calm-tech break nudge (20-20-20). While a break is due, the screen edges
// "breathe" a warm tint and a gentle prompt fades in and out. Deliberately slow
// and non-flashing — it lives in the periphery and is easy to ignore until you
// choose to act, then clears itself once you actually take a break (the main
// process resets the work streak on a ≥45s pause).
export function drawBreakNudge(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: OverlayState,
  time: number,
): void {
  if (!state.breakReminders) return;
  const level = state.presence?.breakLevel ?? 0;
  if (level <= 0) return;

  const overdue = level >= 2;
  // Slow breathing 0..1; a touch faster and stronger when overdue.
  const period = overdue ? 2200 : 3400;
  const breath = 0.5 - 0.5 * Math.cos(((time % period) / period) * Math.PI * 2);

  // Amber = "due", warmer red-orange = "overdue".
  const [r, g, b] = overdue ? [255, 90, 40] : [255, 175, 40];
  const peak = overdue ? 0.16 : 0.1;
  const a = breath * peak * state.intensity;
  const band = Math.min(H * 0.18, 160);

  ctx.save();

  // Warm gradient breathing in from the top and bottom edges.
  let grad = ctx.createLinearGradient(0, 0, 0, band);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, band);

  grad = ctx.createLinearGradient(0, H, 0, H - band);
  grad.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, H - band, W, band);

  // A quiet prompt, centred at the top.
  const msg = overdue
    ? 'BREAK OVERDUE // LOOK 20FT AWAY · STAND · STRETCH'
    : 'EYES 20-20-20 // LOOK 20FT AWAY FOR 20S';
  ctx.globalAlpha = Math.min(1, (0.35 + breath * 0.5) * state.intensity);
  legibleText(ctx);
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillText(msg, W / 2, 24);

  ctx.restore();
}
