import type { OverlayState } from '../../shared/types';
import { themeColor, hexToRgb } from '../../shared/colors';
import { legibleText } from './layout';

// A directional cue drawn from where you're working toward a popup that just
// appeared somewhere you're probably not looking. The value is the *condition*
// (handled by the engine): it only fires for a new notification/alert that's
// away from your focus locus — so it catches the toast you'd miss without
// nagging about the one already under your eyes.

export interface RadarPing {
  tx: number; // normalised target centre (0..1)
  ty: number;
  born: number;
  label: string;
}

export const RADAR_PING_MS = 1700;

export function drawNotificationRadar(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  pings: RadarPing[],
  originX: number, // pixel coords of the focus locus / cursor to point *from*
  originY: number,
  time: number,
  state: OverlayState,
): void {
  if (pings.length === 0) return;
  const now = Date.now();
  const [r, g, b] = hexToRgb(themeColor(state.colorTheme, 'secondary'));
  const intensity = state.intensity;

  ctx.save();
  for (const p of pings) {
    const t = (now - p.born) / RADAR_PING_MS;
    if (t >= 1) continue;
    const tx = p.tx * W;
    const ty = p.ty * H;

    const dx = tx - originX;
    const dy = ty - originY;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    // Fade the whole cue in fast, hold, then out.
    const fade = t < 0.12 ? t / 0.12 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    const a = Math.max(0, fade) * intensity;

    // A dashed guide line from just outside the cursor toward the popup, with a
    // travelling dash so the eye is drawn *along* it to the target.
    const startGap = 34;
    const sx = originX + ux * startGap;
    const sy = originY + uy * startGap;
    const endGap = 26; // stop short so the arrowhead + ring read cleanly
    const ex = tx - ux * endGap;
    const ey = ty - uy * endGap;

    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.lineDashOffset = -time / 30;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead pointing at the target.
    const ah = 9;
    const angle = Math.atan2(uy, ux);
    ctx.globalAlpha = a;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.moveTo(ex + ux * ah, ey + uy * ah);
    ctx.lineTo(ex + Math.cos(angle + 2.5) * ah, ey + Math.sin(angle + 2.5) * ah);
    ctx.lineTo(ex + Math.cos(angle - 2.5) * ah, ey + Math.sin(angle - 2.5) * ah);
    ctx.closePath();
    ctx.fill();

    // Expanding sonar ring on the popup itself.
    const ring = 8 + ((now - p.born) % 900) / 900 * 26;
    ctx.globalAlpha = a * (1 - ((now - p.born) % 900) / 900) * 0.9;
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, ring, 0, Math.PI * 2);
    ctx.stroke();

    // Label above the target.
    ctx.globalAlpha = a;
    legibleText(ctx);
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillText(p.label, tx, ty - 16);
  }
  ctx.restore();
}
