import type { OverlayState } from '../../shared/types';
import { themeColor, hexToRgb } from '../../shared/colors';

export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: OverlayState,
  time: number,
  intensityOverride?: number,
): void {
  const { showScanlines, activityLevel, screen, colorTheme } = state;
  if (!showScanlines) return;
  const intensity = intensityOverride ?? state.intensity;

  const [r, g, b] = hexToRgb(themeColor(colorTheme, 'primary'));
  const [sr, sg, sb] = hexToRgb(themeColor(colorTheme, 'secondary'));
  const speed = 0.3 + activityLevel * 0.7;
  const offset = (time * speed) % 6;

  // Primary scanlines
  ctx.save();
  ctx.globalAlpha = intensity * (0.08 + screen.brightness * 0.12);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  for (let y = offset; y < H; y += 6) {
    ctx.fillRect(0, y, W, 1);
  }

  // Secondary scanlines (offset)
  ctx.globalAlpha = intensity * 0.04;
  ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
  for (let y = offset + 3; y < H; y += 6) {
    ctx.fillRect(0, y, W, 1);
  }

  // Bright screen boost
  if (screen.brightness < 0.3) {
    ctx.globalAlpha = intensity * 0.06;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    for (let y = 0; y < H; y += 3) {
      ctx.fillRect(0, y, W, 1);
    }
  }

  ctx.restore();
}
