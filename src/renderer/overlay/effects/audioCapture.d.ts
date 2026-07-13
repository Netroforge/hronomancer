import type { AudioAnalysis } from '../../shared/types';
/**
 * Captures the default microphone via getUserMedia and exposes a live
 * {@link AudioAnalysis} derived from an FFT. Everything stays in the renderer;
 * `update()` is meant to be called once per rendered frame.
 *
 * The `audio` object instance is stable — its fields are mutated in place — so
 * callers can hold the reference and read updated values each frame.
 */
export declare class AudioCapture {
    readonly audio: AudioAnalysis;
    private ctx;
    private analyser;
    private freqData;
    private stream;
    private started;
    start(): Promise<void>;
    update(): void;
    stop(): void;
}
