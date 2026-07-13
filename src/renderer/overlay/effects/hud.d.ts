import type { OverlayState } from '../../shared/types';
export declare function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number, state: OverlayState): void;
/** Per-side flash strength (0..1) for directional notification cues. */
export interface EdgeFlash {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export declare function drawEdgeGlow(ctx: CanvasRenderingContext2D, W: number, H: number, state: OverlayState, time: number, load?: number, edgeFlash?: EdgeFlash): void;
export declare function drawStatusHud(ctx: CanvasRenderingContext2D, W: number, H: number, state: OverlayState): void;
export declare function drawSysTag(ctx: CanvasRenderingContext2D, W: number, H: number, state: OverlayState): void;
export declare function drawActivityBar(ctx: CanvasRenderingContext2D, state: OverlayState): void;
