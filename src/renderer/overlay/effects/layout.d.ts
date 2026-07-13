import type { HudPosition } from '../../shared/types';
/**
 * Set a dark halo behind text so light-coloured HUD text stays legible on a
 * bright desktop (the overlay is transparent, so on a white background the
 * neon text otherwise washes out). Invisible on dark backgrounds. Must be
 * called inside the caller's save()/restore() so it's reset afterwards.
 */
export declare function legibleText(ctx: CanvasRenderingContext2D): void;
/** Clear any text halo set by {@link legibleText} (e.g. before filling bars). */
export declare function clearShadow(ctx: CanvasRenderingContext2D): void;
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
export declare function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, accent: [number, number, number], pad?: number, radius?: number): {
    x: number;
    y: number;
};
/**
 * Resolve the top-left pixel origin for a HUD panel of the given size from its
 * {@link HudPosition}. The panel hugs `pos.side`, and `pos.offset` (0..1) slides
 * it along that edge between the two corners — 0 at the start corner, 1 at the
 * end — so panels can sit anywhere along a side, not just in the corners. A
 * uniform `margin` keeps them off the screen edge. Individual draw functions
 * derive their content coordinates from this origin, so one `layout` setting
 * relocates the whole panel.
 */
export declare function panelAnchor(pos: HudPosition, W: number, H: number, panelW: number, panelH: number, margin?: number): {
    x: number;
    y: number;
};
