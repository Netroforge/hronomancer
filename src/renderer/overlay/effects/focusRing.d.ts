import type { OverlayState } from '../../shared/types';
/**
 * A progress arc traced around the screen edge:
 *   - Pomodoro active → time remaining in the session (ring depletes), coloured
 *     by phase (work vs break).
 *   - Otherwise → a faint marker of progress through the current hour, so time
 *     passing registers in the periphery without a visible clock.
 */
export declare function drawFocusRing(ctx: CanvasRenderingContext2D, W: number, H: number, state: OverlayState): void;
