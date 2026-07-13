import type { OverlayState } from '../../shared/types';
import { themeColor, hexToRgb } from '../../shared/colors';

export function drawNotificationFlash(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: OverlayState,
): void {
  if (state.notificationFlash <= 0) return;

  const { colorTheme, notificationFlash } = state;
  const [r, g, b] = hexToRgb(themeColor(colorTheme, 'secondary'));

  ctx.save();

  // Screen edge flash
  const alpha = notificationFlash * 0.4;
  ctx.globalAlpha = alpha;

  // Top edge
  const gradientTop = ctx.createLinearGradient(0, 0, 0, 30);
  gradientTop.addColorStop(0, `rgba(${r},${g},${b},0.6)`);
  gradientTop.addColorStop(1, 'transparent');
  ctx.fillStyle = gradientTop;
  ctx.fillRect(0, 0, W, 30);

  // Bottom edge
  const gradientBottom = ctx.createLinearGradient(0, H, 0, H - 30);
  gradientBottom.addColorStop(0, `rgba(${r},${g},${b},0.6)`);
  gradientBottom.addColorStop(1, 'transparent');
  ctx.fillStyle = gradientBottom;
  ctx.fillRect(0, H - 30, W, 30);

  // Left edge
  const gradientLeft = ctx.createLinearGradient(0, 0, 30, 0);
  gradientLeft.addColorStop(0, `rgba(${r},${g},${b},0.4)`);
  gradientLeft.addColorStop(1, 'transparent');
  ctx.fillStyle = gradientLeft;
  ctx.fillRect(0, 0, 30, H);

  // Right edge
  const gradientRight = ctx.createLinearGradient(W, 0, W - 30, 0);
  gradientRight.addColorStop(0, `rgba(${r},${g},${b},0.4)`);
  gradientRight.addColorStop(1, 'transparent');
  ctx.fillStyle = gradientRight;
  ctx.fillRect(W - 30, 0, 30, H);

  // Corner bursts
  ctx.globalAlpha = notificationFlash * 0.6;
  ctx.fillStyle = `rgba(${r},${g},${b},0.3)`;
  const burstSize = notificationFlash * 80;
  ctx.beginPath();
  ctx.arc(0, 0, burstSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W, 0, burstSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, H, burstSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W, H, burstSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
