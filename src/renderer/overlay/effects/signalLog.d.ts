import type { OverlayState, SignalEvent } from '../../shared/types';
export declare function drawSignalLog(ctx: CanvasRenderingContext2D, W: number, H: number, state: OverlayState, events: SignalEvent[], now: number, recap: boolean, // just returned from away → reframe as a recap
time: number): void;
