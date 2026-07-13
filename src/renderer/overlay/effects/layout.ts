import type { HudPosition } from '../../shared/types';

/**
 * Set a dark halo behind text so light-coloured HUD text stays legible on a
 * bright desktop (the overlay is transparent, so on a white background the
 * neon text otherwise washes out). Invisible on dark backgrounds. Must be
 * called inside the caller's save()/restore() so it's reset afterwards.
 */
export function legibleText(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
}

/** Clear any text halo set by {@link legibleText} (e.g. before filling bars). */
export function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Paint a styled, near-opaque HUD panel frame at (x,y) sized w×h in the given
 * accent colour, and return the content-area origin so the caller can lay text
 * out with a consistent inset. Every readout shares the same chrome:
 *
 *  - a rounded dark card with a soft top-lit gradient — near-solid (not the old
 *    brightness-scaled translucent backing) so text stays fully legible on any
 *    desktop, dark or bright;
 *  - a faint accent tint over the body for a tinted-glass feel;
 *  - an accent-tinted border wrapped in a soft outer glow;
 *  - a bright accent bar hugging the top edge as the panel's "active" chrome.
 *
 * Must be called inside the caller's own save()/restore() — it leaves
 * fillStyle/strokeStyle/shadow dirty.
 */
export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  accent: [number, number, number],
  pad = 10,
  radius = 7,
): { x: number; y: number } {
  const [r, g, b] = accent;

  // Body: near-opaque vertical gradient (top lifted for depth), wrapped in a
  // soft accent glow so the card reads as a lit panel rather than a flat box.
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgb(20,24,33)');
  grad.addColorStop(1, 'rgb(10,12,16)');
  ctx.save();
  // Fully opaque body — independent of the global intensity dimmer — so the
  // card is never see-through and its text always has a solid backing.
  ctx.globalAlpha = 1;
  ctx.shadowColor = `rgba(${r},${g},${b},0.45)`;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Faint accent wash + border (no glow — the body already carries it).
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = `rgba(${r},${g},${b},0.06)`;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`;
  ctx.stroke();

  // Bright bar along the top edge, clipped to the rounded corners.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(x, y, w, 2);
  ctx.restore();

  return { x: x + pad, y: y + pad };
}

/**
 * Resolve the top-left pixel origin for a HUD panel of the given size from its
 * {@link HudPosition}. The panel hugs `pos.side`, and `pos.offset` (0..1) slides
 * it along that edge between the two corners — 0 at the start corner, 1 at the
 * end — so panels can sit anywhere along a side, not just in the corners. A
 * uniform `margin` keeps them off the screen edge. Individual draw functions
 * derive their content coordinates from this origin, so one `layout` setting
 * relocates the whole panel.
 */
export function panelAnchor(
  pos: HudPosition,
  W: number,
  H: number,
  panelW: number,
  panelH: number,
  margin = 15,
): { x: number; y: number } {
  const spanX = Math.max(0, W - panelW - margin * 2);
  const spanY = Math.max(0, H - panelH - margin * 2);
  const t = Math.min(1, Math.max(0, pos.offset));
  switch (pos.side) {
    case 'top': return { x: margin + t * spanX, y: margin };
    case 'bottom': return { x: margin + t * spanX, y: H - panelH - margin };
    case 'left': return { x: margin, y: margin + t * spanY };
    case 'right': return { x: W - panelW - margin, y: margin + t * spanY };
    default: return { x: W - panelW - margin, y: H - panelH - margin };
  }
}
