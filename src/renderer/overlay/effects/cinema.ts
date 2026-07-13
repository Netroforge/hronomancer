import type { OverlayState } from '../../shared/types';

// "Cinema mode": when the analyser detects video playback, the overlay gets out
// of the way of it. An always-on effect layer that glitches and scanlines over
// the film you're watching is the #1 reason people uninstall this kind of app —
// so knowing when to *disappear* is as valuable as knowing when to appear.
//
// Implemented as a destination-out clear over each playback region: it erases
// whatever noise/texture layers were painted *before* it (scanlines, glitches,
// colour flash, cursor trail), leaving the real video untouched. Intentional,
// sparse cues drawn *after* this (attention brackets, radar, HUD) still show.

// Only regions at least this fraction of the screen count as "playback" worth
// clearing, so a small animated favicon can't punch a hole in the overlay.
const MIN_AREA = 0.05;

export function suppressVideoRegions(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  state: OverlayState,
): void {
  const regions = state.attention?.regions;
  if (!regions || regions.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 1;
  for (const r of regions) {
    if (r.type !== 'video' || r.dismissed) continue;
    if (r.w * r.h < MIN_AREA) continue;
    // A small feather so the cleared area doesn't read as a hard-edged cut-out.
    const feather = 6;
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = feather;
    ctx.fillStyle = '#000';
    ctx.fillRect(r.x * W + feather, r.y * H + feather, r.w * W - feather * 2, r.h * H - feather * 2);
  }
  ctx.restore();
}
