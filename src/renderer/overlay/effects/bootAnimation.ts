import type { OverlayState } from '../../shared/types';
import { themeColor, hexToRgb } from '../../shared/colors';

const BOOT_LINES = [
  '> HRONOMANCER v1.0.0',
  '> Initializing neural interface...',
  '> Loading glitch matrix...',
  '> Calibrating scanline frequency...',
  '> Mounting cyberdeck drivers...',
  '> Activating overlay subsystem...',
  '> Scanning display array...',
  '> Connecting to input stream...',
  '> Loading theme engine...',
  '> System ready.',
];

export function drawBootAnimation(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: OverlayState,
  time: number,
): boolean {
  if (state.bootComplete) return false;

  const { colorTheme } = state;
  const [r, g, b] = hexToRgb(themeColor(colorTheme, 'primary'));
  const elapsed = (time - state.lastActivity) / 1000; // approximate boot time

  ctx.save();

  // No opaque backdrop — the boot sequence plays over the live desktop
  // (transparent overlay), so only the text and scanlines show.

  // Scanlines even during boot
  ctx.globalAlpha = 0.15;
  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = `rgba(${r},${g},${b},0.1)`;
    ctx.fillRect(0, y, W, 1);
  }

  ctx.globalAlpha = 1;
  ctx.textBaseline = 'top';

  const linesVisible = Math.min(BOOT_LINES.length, Math.floor(time / 300));
  const lineH = 22;
  const startY = H / 2 - (BOOT_LINES.length * lineH) / 2;

  for (let i = 0; i < linesVisible; i++) {
    const lineAge = time - i * 300;
    const alpha = Math.min(1, lineAge / 500);
    const glitchX = lineAge < 200 ? (Math.random() - 0.5) * 10 : 0;

    ctx.globalAlpha = alpha * 0.9;
    ctx.font = '400 13px "JetBrains Mono", monospace';

    // Alternate colors
    if (i === BOOT_LINES.length - 1) {
      ctx.fillStyle = themeColor(colorTheme, 'accent');
    } else if (i % 2 === 0) {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
    } else {
      const [sr, sg, sb] = hexToRgb(themeColor(colorTheme, 'secondary'));
      ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
    }

    ctx.fillText(BOOT_LINES[i], W / 2 - 200 + glitchX, startY + i * lineH);
  }

  // Blinking cursor
  if (linesVisible < BOOT_LINES.length) {
    const cursorAlpha = Math.sin(time / 100) > 0 ? 1 : 0;
    ctx.globalAlpha = cursorAlpha;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillText('_', W / 2 - 200, startY + linesVisible * lineH);
  }

  // Glitch bars during boot
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 5; i++) {
    if (Math.random() > 0.7) {
      const gy = Math.random() * H;
      const gw = Math.random() * W * 0.3;
      const gx = Math.random() * W;
      ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
      ctx.fillRect(gx, gy, gw, 2);
    }
  }

  ctx.restore();
  return true;
}
