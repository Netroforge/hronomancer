import type { OverlayState } from '../../shared/types';
export interface DonePulse {
    cx: number;
    cy: number;
    born: number;
    label: string;
}
export declare const DONE_PULSE_MS = 2600;
export declare function drawTaskComplete(ctx: CanvasRenderingContext2D, W: number, H: number, pulses: DonePulse[], time: number, state: OverlayState): void;
