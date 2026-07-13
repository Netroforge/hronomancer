import type { OverlayState } from '../../shared/types';
import { themeColor, hexToRgb } from '../../shared/colors';
import { legibleText, drawPanel, panelAnchor } from './layout';

// An ambient, glanceable readout of how long you've been at the screen without a
// real break. This is the calm-tech answer to the most-repeated request from the
// research: people don't want another popup, they want a *peripheral* signal for
// elapsed time. It serves two audiences at once — eye-strain (the 20-20-20 rule's
// benefit is entirely about compliance, i.e. actually noticing) and ADHD
// time-blindness ("I don't realise how long I've been staring"). It never
// interrupts: it just sits there and warms in hue as the session lengthens.

// Reference point for the colour ramp — the "20" of 20-20-20, matching the
// break-nudge threshold in the main process.
const BREAK_DUE_MS = 20 * 60_000;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Calm theme hue → amber → red as the unbroken session grows past the break mark.
function rampColor(base: [number, number, number], ratio: number): [number, number, number] {
  const amber: [number, number, number] = [255, 176, 32];
  const red: [number, number, number] = [255, 72, 48];
  if (ratio <= 0) return base;
  if (ratio < 1) return [lerp(base[0], amber[0], ratio), lerp(base[1], amber[1], ratio), lerp(base[2], amber[2], ratio)];
  const t = Math.min(1, ratio - 1);
  return [lerp(amber[0], red[0], t), lerp(amber[1], red[1], t), lerp(amber[2], red[2], t)];
}

function fmt(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function drawSessionTime(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: OverlayState,
  time: number,
): void {
  if (!state.showSessionTime) return;
  const elapsed = state.presence?.continuousActiveMs ?? 0;
  const ratio = elapsed / BREAK_DUE_MS;
  const base = hexToRgb(themeColor(state.colorTheme, 'primary'));
  const [r, g, b] = rampColor(base, ratio).map(Math.round) as [number, number, number];

  const PW = 118;
  const PH = 46;
  ctx.save();
  ctx.globalAlpha = state.intensity;
  const { x: panelX, y: panelY } = panelAnchor(state.layout.sessionTime, W, H, PW, PH);
  const { x, y } = drawPanel(ctx, panelX, panelY, PW, PH, [r, g, b], 10);

  legibleText(ctx);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = '700 8px "JetBrains Mono", monospace';
  ctx.fillStyle = `rgba(${r},${g},${b},0.7)`;
  ctx.fillText('SESSION // AT SCREEN', x, y);

  // Once past the break mark, the readout breathes gently — a peripheral "time to
  // look away" cue that still never demands a click.
  const overdue = ratio >= 1;
  const breath = overdue ? 0.7 + 0.3 * Math.sin(time / 500) : 1;
  ctx.globalAlpha = state.intensity * breath;
  ctx.font = '700 20px "JetBrains Mono", monospace';
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillText(fmt(elapsed), x, y + 12);
  ctx.restore();
}
