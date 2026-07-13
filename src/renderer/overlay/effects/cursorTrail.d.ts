import type { OverlayState, TrailPoint } from '../../shared/types';
export declare function updateTrail(trail: TrailPoint[], x: number, y: number, vx: number, vy: number, activity: number, intensity: number): void;
export declare function drawCursorTrail(ctx: CanvasRenderingContext2D, state: OverlayState): void;
