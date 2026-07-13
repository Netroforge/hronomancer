import type { OverlayState } from '../../shared/types';
export interface RadarPing {
    tx: number;
    ty: number;
    born: number;
    label: string;
}
export declare const RADAR_PING_MS = 1700;
export declare function drawNotificationRadar(ctx: CanvasRenderingContext2D, W: number, H: number, pings: RadarPing[], originX: number, // pixel coords of the focus locus / cursor to point *from*
originY: number, time: number, state: OverlayState): void;
